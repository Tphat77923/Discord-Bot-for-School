const { PermissionFlagsBits, ApplicationCommandOptionType, ChannelType, PermissionsBitField } = require("discord.js");
const Student = require("../../models/Student.js");
const Teacher = require("../../models/Teacher.js");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const Class = require("../../models/Class.js");
function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = {
    name: "teacher",
    description: "Manage teacher",
    options: [
        {
            name: "delete",
            description: "🗑️ Delete a teacher by ID",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "teacher_name",
                    description: "Teacher name to delete",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        {
            name: "add",
            description: "➕ Add a new teacher",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "teacher_name",
                    description: "Teacher name to add",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "class_name",
                    description: "Class to assign to the teacher",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        {
            name: "list",
            description: "📜 List all teachers",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "class_name",
                    description: "Name of the class to list teachers for",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                }
            ]
        },
        {
            name: "update",
            description: "🔄 Update a teacher's class",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "teacher_name",
                    description: "Teacher name to update",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "add_class",
                    description: "New class for the teacher",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
                {
                    name: "remove_class",
                    description: "Class to remove from the teacher",
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },

            ]
        }
    ],

    callback: async (client, interaction) => {
        const { options } = interaction;
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });

        await interaction.reply({ content: "please wait...", ephemeral: true });

        switch (options.getSubcommand()) {
            case "delete": {
                const teacherId = options.getString("teacher_name");
                if (!teacherId) {
                    return interaction.followUp({ content: "Please provide a valid teacher name.", ephemeral: true });
                }

                const teacher = await Teacher.findOne({ name: teacherId });
                if (!teacher) {
                    return interaction.followUp({ content: "Teacher not found.", ephemeral: true });
                }
                if (teacher.authId !== 0) {
                    const member = await interaction.guild.members.fetch(teacher.authId).catch(() => null);
                    if (member) {
                        //remove teacher from all classes
                        for (const className of teacher.classList) {
                            const normalizedClassName = normalizeClassName(className);
                            const existingClass = await Class.findOne({ className: className, schoolID: interaction.guild.id });
                            if (existingClass) {
                                const category = interaction.guild.channels.cache.get(existingClass.classId);
                                if (category && category.type === ChannelType.GuildCategory) {
                                    await category.permissionOverwrites.edit(teacher.authId, {
                                        ViewChannel: false,
                                        SendMessages: false,
                                        Connect: false
                                    });
                                }
                            }
                        }
                    }
                }

                await Teacher.deleteOne({ name: teacherId });
                
                return interaction.followUp({ content: `Teacher with name ${teacherId} has been deleted.`, ephemeral: true });
            }

            case "add": {
                const teacherId = options.getString("teacher_name");
                const className = options.getString("class_name");
                const normalizedClassName = normalizeClassName(className);
                const existingClass = await Class.findOne({ className: className, schoolID: interaction.guild.id });
                if (!existingClass) return interaction.followUp({ content: `Class "${className}" does not exist.`, ephemeral: true });
                const guildID = interaction.guild.id;
                if (!teacherId) {
                    return interaction.followUp({ content: "Please provide a valid teacher name", ephemeral: true });
                }

                const existingTeacher = await Teacher.findOne({ name: teacherId });
                if (existingTeacher) {
                    return interaction.followUp({ content: "This teacher already exists.", ephemeral: true });
                }

                const userId = uuidv4().slice(0, 8);
                const rawPass = Math.random().toString(36).slice(-8);
                const hashedPassword = bcrypt.hashSync(rawPass, 10);

                Teacher.create({
                    name: teacherId,
                    userId,
                    classID: 0,
                    schoolID: guildID,
                    password: hashedPassword,
                    classList: [className],
                    classIds: { [normalizedClassName]: existingClass.classId }
                });
                await interaction.user.send({
                    content: `You have been added as a teacher ${teacherId} with ID ${userId} and password ${rawPass}.`
                }).catch(() => {
                    console.error("Failed to send DM to the user.");
                });
                return interaction.followUp({ content: `Teacher with name ${teacherId} has been added.`, ephemeral: true });
            }

            case "list": {
                const className = options.getString("class_name");
                let teachers;

                if (className) {
                    const normalizedClassName = normalizeClassName(className);
                    teachers = await Teacher.find({ classes: normalizedClassName });
                    if (teachers.length === 0) {
                        return interaction.followUp({ content: `No teachers found for class "${className}".`, ephemeral: true });
                    }
                } else {
                    teachers = await Teacher.find();
                    if (teachers.length === 0) {
                        return interaction.followUp({ content: "No teachers found.", ephemeral: true });
                    }
                }

                const response = teachers.map(t => `ID: ${t.name}, classList: ${t.classList.join(", ")}`).join("\n");
                return interaction.followUp({ content: response, ephemeral: true });
            }

            case "update": {
                const teacherName = options.getString("teacher_name");
                const addClass = options.getString("add_class");
                const removeClass = options.getString("remove_class");

                if (!addClass && !removeClass) return interaction.followUp({ content: "Please provide a valid class to update.", ephemeral: true });

                const teacher = await Teacher.findOne({ name: teacherName });
                if (!teacher) {
                    return interaction.followUp({ content: "Teacher not found.", ephemeral: true });
                }

                //add class
                if (addClass) {
                    const normalizedClassName = normalizeClassName(addClass);
                    const existingClass = await Class.findOne({ className: addClass, schoolID: interaction.guild.id });

                    if (!existingClass) return interaction.followUp({ content: `Class "${addClass}" does not exist.`, ephemeral: true }); 

                    if (!teacher.classList.includes(addClass)) {
                        teacher.classList.push(addClass);
                    if (!teacher.classIds) teacher.classIds = new Map();
                        teacher.classIds.set(normalizedClassName, existingClass.classId);
                    let member;
                    if (teacher.authId !== 0) member = await interaction.guild.members.fetch(teacher.authId).catch(() => null);
                    if (teacher.authId !== 0 && member) {
                    //add teacher to class if they are not already in it
                    const category = interaction.guild.channels.cache.get(existingClass.classId);
                    if (category && category.type === ChannelType.GuildCategory) {
                    await category.permissionOverwrites.edit(teacher.authId, {
                        ViewChannel: true,
                        SendMessages: true,
                        Connect: true
                    });
                    }
                }
                    } else {
                        return interaction.followUp({ content: `Teacher already has class "${addClass}".`, ephemeral: true });
                    }
                }
            
                //remove class
                if (removeClass) {
                    const normalizedClassName = normalizeClassName(removeClass);
                    const existingClass = await Class.findOne({ className: removeClass, schoolID: interaction.guild.id });
                    if (teacher.classList.includes(removeClass)) {
                        teacher.classList = teacher.classList.filter(c => c !== removeClass);
                        if (teacher.classIds && teacher.classIds.has(normalizedClassName)) {
                            teacher.classIds.delete(normalizedClassName);
                        }
                        const member = await interaction.guild.members.fetch(teacher.authId).catch(() => null);
                        if (teacher.authId !== 0 && member) {
                            //remove teacher from class if they are in it
                            const category = interaction.guild.channels.cache.get(existingClass.classId);
                            if (category && category.type === ChannelType.GuildCategory) {
                                await category.permissionOverwrites.edit(teacher.authId, {
                                    ViewChannel: false,
                                    SendMessages: false,
                                    Connect: false
                                });
                            }
                        }
                    } else {
                        return interaction.followUp({ content: `Teacher does not have class "${removeClass}".`, ephemeral: true });
                    }
                }

                await teacher.save();
                return interaction.followUp({ content: `Teacher with name ${teacherName} has been updated.`, ephemeral: true });
            }
        }
    }
}