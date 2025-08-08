const { ChannelType, PermissionsBitField } = require("discord.js");
const Student = require("../models/Student.js");
const Teacher = require("../models/Teacher.js");
const Class = require("../models/Class.js");

function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = async (guild, classNames = [], students = [], teachers = []) => {
  const maxChannels = 500; // Discord limit
  let created = 0;

  for (const rawClassName of classNames) {
    if (created + 2 > maxChannels) break;

    const className = normalizeClassName(rawClassName);

    const existing = guild.channels.cache.find(
      (c) => normalizeClassName(c.name) === className
    );
    if (existing) continue;


    const category = await guild.channels.create({
      name: className,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });


    await guild.channels.create({
      name: `${className}-chat`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });


    await guild.channels.create({
      name: `${className}-voice`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });


    await Class.create(
      { className: rawClassName,
        classId: category.id, 
        schoolID: guild.id 
      });


    for (const student of students.filter(s => s.className.replace(/[\s_-]/g, "").toLowerCase() === className)) {
      await Student.updateOne(
        { userId: student.userId },
        { $set: { classId: category.id } },
        { upsert: true }
      );
    }

    for (const teacher of teachers.filter(t =>
      t.classList.some(cls => cls.replace(/[\s_-]/g, "").toLowerCase() === className)
    )) {
      await Teacher.updateOne(
        { userId: teacher.userId },
        { $set: { [`classIds.${className}`]: category.id } },
        { upsert: true }
      );
    }

    created += 2;
  }
};
