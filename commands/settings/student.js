const { PermissionFlagsBits, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const Student = require("../../models/Student.js");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Class = require("../../models/Class.js");

function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = {
  name: "student",
  description: "Manage student",
  options: [
    {
      name: "delete",
      description: "🗑️ Delete a student by name",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "student_name",
          description: "Student name to delete",
          type: ApplicationCommandOptionType.String,
          required: true,
        }
      ]
    },
    {
      name: "add",
      description: "➕ Add a new student",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "student_name",
          description: "Student name to add",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "class_name",
          description: "Class to assign to the student",
          type: ApplicationCommandOptionType.String,
          required: true,
        }
      ]
    },
    {
      name: "list",
      description: "📜 List all students",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "class_name",
          description: "Name of the class to list students for",
          type: ApplicationCommandOptionType.String,
          required: false,
        }
      ]
    },
    {
      name: "update",
      description: "🔄 Update a student's class",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "student_name",
          description: "Student name to update",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "new_class",
          description: "New class to assign",
          type: ApplicationCommandOptionType.String,
          required: true,
        }
      ]
    }
  ],

  callback: async (client, interaction) => {
    const { options } = interaction;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    await interaction.reply({ content: "please wait...", ephemeral: true });

    const sub = options.getSubcommand();

    switch (sub) {
      case "delete": {
        const studentName = options.getString("student_name");

        const student = await Student.findOne({ name: studentName });
        if (!student) return interaction.followUp({ content: "Student not found.", ephemeral: true });
        if (student.authId !== 0) {
          const category = interaction.guild.channels.cache.get(student.classId);
          if (category && category.type === ChannelType.GuildCategory) {
            const member = await interaction.guild.members.fetch(student.authId).catch(() => null);
            if (member) {
              await category.permissionOverwrites.edit(member.id, {
                ViewChannel: false,
                SendMessages: false,
                Connect: false
              });
            }
          }
        }

        await Student.deleteOne({ name: studentName });
        return interaction.followUp({ content: `Student "${studentName}" has been deleted.`, ephemeral: true });
      }

      case "add": {
        const studentName = options.getString("student_name");
        const className = options.getString("class_name");
        const normalizedClassName = normalizeClassName(className);
        const guildID = interaction.guild.id;

        const existingClass = await Class.findOne({ className: className, schoolID: guildID });
        if (!existingClass)
          return interaction.followUp({ content: `Class "${className}" does not exist.`, ephemeral: true });

        const existingStudent = await Student.findOne({ name: studentName });
        if (existingStudent)
          return interaction.followUp({ content: "This student already exists.", ephemeral: true });

        const userId = uuidv4().slice(0, 8);
        const rawPass = Math.random().toString(36).slice(-8);
        const hashedPassword = bcrypt.hashSync(rawPass, 10);

        await Student.create({
          name: studentName,
          userId,
          className: className,
          classId: existingClass.classId,
          schoolID: guildID,
          password: hashedPassword,
        });

        const category = interaction.guild.channels.cache.get(existingClass.classId);
        if (category && category.type === ChannelType.GuildCategory) {
          if (interaction.user) {
            await category.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
              SendMessages: true,
              Connect: true
            }).catch(() => {});
          }
        }

        await interaction.user.send({
          content: `You have been added as a student ${studentName} with ID ${userId} and password ${rawPass}.`
        }).catch(() => console.error("Failed to send DM to the user."));

        return interaction.followUp({ content: `Student "${studentName}" has been added.`, ephemeral: true });
      }

      case "list": {
        const className = options.getString("class_name");
        let students;

        if (className) {
          students = await Student.find({ className });
          if (students.length === 0)
            return interaction.followUp({ content: `No students found for class "${className}".`, ephemeral: true });
        } else {
          students = await Student.find();
          if (students.length === 0)
            return interaction.followUp({ content: "No students found.", ephemeral: true });
        }

        const response = students.map(s => `Name: ${s.name}, Class: ${s.className}`).join("\n");
        return interaction.followUp({ content: response, ephemeral: true });
      }

      case "update": {
        const studentName = options.getString("student_name");
        const newClass = options.getString("new_class");
        const normalizedClassName = normalizeClassName(newClass);

        const student = await Student.findOne({ name: studentName });
        if (!student) {
          return interaction.followUp({ content: "Student not found.", ephemeral: true });
        }

        const existingClass = await Class.findOne({ className: newClass, schoolID: interaction.guild.id });
        if (!existingClass) {
          return interaction.followUp({ content: `Class "${newClass}" does not exist.`, ephemeral: true });
        }

        // Revoke old class permission
        if (student.classId && student.authId !== 0) {
          const oldCategory = interaction.guild.channels.cache.get(student.classId);
          const member = await interaction.guild.members.fetch(student.authId).catch(() => null);
          if (oldCategory && oldCategory.type === ChannelType.GuildCategory && member) {
            await oldCategory.permissionOverwrites.edit(student.authId, {
              ViewChannel: false,
              SendMessages: false,
              Connect: false
            });
          }
        }

        // Update DB
        student.className = newClass;
        student.classId = existingClass.classId;
        await student.save();

        // Grant new class permission
        if (student.authId !== 0) {
          const category = interaction.guild.channels.cache.get(existingClass.classId);
          const member = await interaction.guild.members.fetch(student.authId).catch(() => null);
          if (category && category.type === ChannelType.GuildCategory && member) {
            await category.permissionOverwrites.edit(student.authId, {
              ViewChannel: true,
              SendMessages: true,
              Connect: true
            });
          }
        }

        return interaction.followUp({ content: `Student "${studentName}" has been updated to class "${newClass}".`, ephemeral: true });
      }
    }
  }
};
