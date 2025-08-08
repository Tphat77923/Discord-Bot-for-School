const { PermissionFlagsBits, ApplicationCommandOptionType, ChannelType, PermissionsBitField } = require("discord.js");
const Student = require("../../models/Student.js");
const Teacher = require("../../models/Teacher.js");
const Class = require("../../models/Class.js");
// Hàm normalize tên lớp để đồng bộ so sánh
function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = {
    name: "class",
    description: "Modify class settings",
    options: [
        {
            name: "delete",
            description: "🗑️ Delete a class by name",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "class_name",
                    description: "Class name to delete",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        // add class
        {
            name: "add",
            description: "➕ Add a new class",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "class_name",
                    description: "Class name to add",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        // list classes
        {
            name: "list",
            description: "📜 List all classes",
            type: ApplicationCommandOptionType.Subcommand,
        },
        // rename class
        {
            name: "rename",
            description: "✏️ Rename a class",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "old_name",
                    description: "Current class name",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "new_name",
                    description: "New class name",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        }
    ],

    callback: async (client, interaction) => {
        const { options } = interaction;

        switch (options.getSubcommand()) {
            case "delete":
                {
                    const classNameRaw = interaction.options.get("class_name").value;
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return await interaction.reply({ content: "❌ Permission denied", flags: 1 << 6 });
                    }
                    if (!classNameRaw) {
                    return await interaction.reply({ content: "❌ Class name is required", flags: 1 << 6 });
                    }
                    const classNameNorm = normalizeClassName(classNameRaw);

                    await interaction.deferReply({
                        content: "please wait...",
                        flags: 1 << 6
                    });

                    const category = interaction.guild.channels.cache.find(
                    c => c.type === 4 && normalizeClassName(c.name) === classNameNorm
                    );

                    if (!category) {
                    return await interaction.editReply("❌ Class not found.");
                    }


                    // 🧹 Xóa học sinh trong lớp
                    await Student.deleteMany({ classId: category.id, schoolID: interaction.guild.id });
                    // 🧠 Gỡ lớp ra khỏi giáo viên
                    const teachers = await Teacher.find({ schoolID: interaction.guild.id });
                    for (const teacher of teachers) {
                    // Loại bỏ class khỏi classList
                    teacher.classList = teacher.classList.filter(c =>
                        normalizeClassName(c) !== classNameNorm
                    );

                    // Xóa key khỏi classIds map
                    if (teacher.classIds instanceof Map){
                    for (const [key, value] of teacher.classIds.entries()) {
                        if (normalizeClassName(key) === classNameNorm) {
                        teacher.classIds.delete(key);
                        }
                    }

                    await teacher.save();
                    }
                }
                    await Class.deleteOne({ classId: category.id, schoolID: interaction.guild.id });
                    

                    const childChannels = interaction.guild.channels.cache.filter(ch => ch.parentId === category.id);
                    for (const ch of childChannels.values()) {
                    await ch.delete().catch(err => console.error(`❌ Cannot delete channel: ${ch.name}`, err));
                    }

                    await category.delete().catch(err => {
                    console.error("❌ Cannot delete category:", err);
                    });

                    return await interaction.editReply(`✅ Deleted class\`${classNameRaw}\`.`);
                }
                break;
            case "add":
                {
                    const classNameRaw = options.getString("class_name");
                    const classNameNorm = normalizeClassName(classNameRaw);
                    const guild = interaction.guild;

                    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                        return await interaction.reply({ content: "❌ Permission denied", flags: 1 << 6 });
                    }

                    await interaction.reply({ content: "🔄 Creating class...", flags: 1 << 6 });

                    const exists = interaction.guild.channels.cache.find(
                        c => c.type === 4 && normalizeClassName(c.name) === classNameNorm
                    );

                    if (exists) {
                        return await interaction.editReply("❌ Class already exists.");
                    }

                    const category = await interaction.guild.channels.create({
                        name: classNameNorm,
                        type: 4 // Category
                    });
                     await guild.channels.create({
                          name: `${classNameNorm}-chat`,
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
                          name: `${classNameNorm}-voice`,
                          type: ChannelType.GuildVoice,
                          parent: category.id,
                          permissionOverwrites: [
                            {
                              id: guild.roles.everyone.id,
                              deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                          ],
                        });

                    await Class.create({
                        className: classNameNorm,
                        classId: category.id,
                        schoolID: guild.id
                    });
                    return await interaction.editReply(`✅ Created class \`${classNameRaw}\`.`);
                }
                break;
            case "list":
                {
                    const classes = await Class.find({ schoolID: interaction.guild.id });
                    if (classes.length === 0) {
                        return await interaction.reply("❌ No classes found.");
                    }
                    const classList = classes.map(c => `- ${c.className}`).join("\n");
                    if (classList.length > 2000) {
                        const fs = require("fs");
                        const filePath = `./temp/class_list_${interaction.guild.id}.txt`;
                        fs.writeFileSync(filePath, classList);
                        await interaction.reply({
                            content: "📄 There are so many classes for sending messages. This file includes all classes.",
                            files: [filePath]
                        });
                        fs.unlinkSync(filePath);
                    } else {
                        await interaction.reply(`📜 Classes list:\n${classList}`);
                    }
                }
                break;
            case "rename":
                {
                    const oldName = options.getString("old_name");
                    const newName = options.getString("new_name");
                    const guild = interaction.guild;
                    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                        return await interaction.reply({ content: "❌ Permission denied", flags: 1 << 6 });
                    }
                    if (!oldName || !newName) {
                        return await interaction.reply({ content: "❌ Old and new class names are required", flags: 1 << 6 });
                    }
                    await interaction.reply({ content: "renaming class...", flags: 1 << 6 });
                    try{
                    const oldNameNorm = normalizeClassName(oldName);
                    const newNameNorm = normalizeClassName(newName);
                    const category = guild.channels.cache.find(
                        c => c.type === 4 && normalizeClassName(c.name) === oldNameNorm
                    );
                    
                    if (!category) {
                        return await interaction.followUp({ content: "❌ Class not found", flags: 1 << 6 });
                    }
                    if (oldNameNorm === newNameNorm) {
                        return await interaction.followUp({ content: "❌ New name must be different from old name", flags: 1 << 6 });
                    }
                    const exists = guild.channels.cache.find(
                        c => c.type === 4 && normalizeClassName(c.name) === newNameNorm
                    );
                    if (exists) {
                        return await interaction.followUp({ content: "❌ Class with this name already exists", flags: 1 << 6 });
                    }
                    // Rename category
                    await category.setName(newNameNorm).catch(err => {
                        console.error("❌ Cannot rename category:", err);
                        return interaction.followUp({ content: "❌ Cannot rename class", flags: 1 << 6 });
                    });
                    // Rename text channel
                    const textChannel = guild.channels.cache.find(
                        c => c.type === ChannelType.GuildText && c.parentId === category.id
                    );
                    if (textChannel) {
                        await textChannel.setName(`${newNameNorm}-chat`).catch(err => {
                            console.error("❌ Cannot rename text channel:", err);
                            return interaction.followUp({ content: "❌ Cannot rename class chat channel", flags: 1 << 6 });
                        });
                    }
                    // Rename voice channel
                    const voiceChannel = guild.channels.cache.find(
                        c => c.type === ChannelType.GuildVoice && c.parentId === category.id
                    );
                    if (voiceChannel) {
                        await voiceChannel.setName(`${newNameNorm}-voice`).catch(err => {
                            console.error("❌ Cannot rename voice channel:", err);
                            return interaction.followUp({ content: "❌ Cannot rename class voice channel", flags: 1 << 6 });
                        });
                    }


                    // Update class name in database
                    await Class.updateOne({ classId: category.id, schoolID: interaction.guild.id }, { className: newNameNorm });
                    // Update class name in students
                    await Student.updateMany({ classId: category.id, schoolID: interaction.guild.id }, { className: newNameNorm });
                    const teachers = await Teacher.find({ schoolID: guild.id });
                    for (const teacher of teachers) {
                        if (Array.isArray(teacher.classList)) {
                            teacher.classList = teacher.classList.map(c => normalizeClassName(c) === oldNameNorm ? newNameNorm : c);
                        }

                        if (teacher.classIds instanceof Map) {
                            const newMap = new Map();
                            for (const [key, val] of teacher.classIds.entries()) {
                                if (normalizeClassName(key) === oldNameNorm) {
                                    newMap.set(newNameNorm, val);
                                } else {
                                    newMap.set(key, val);
                                }
                            }
                            teacher.classIds = newMap;
                        }
                        await teacher.save();
                    }

                    await interaction.followUp(`Renamed class from ${oldName} to ${newName}`);
                } catch (err) {
                console.error("❌ Error renaming class:", err);
                await interaction.followUp({ content: "❌ Error renaming class", flags: 1 << 6 });
            }
        }
            break;
        }
    }
}