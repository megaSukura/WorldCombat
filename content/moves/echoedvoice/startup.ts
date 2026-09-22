// 回声的「回响」凭据：共享身份 world_combat:status/echoed_voice，振幅 = 当前层数 − 1（0..4）。
// 行为（层数换算威力、持续窗口）写在本单元 parameters.ts；任何内容都能按身份问到「这里还荡着几层回声」。
StartupEvents.registry("mob_effect", event => event.create("world_combat:echoed_voice_echo")
    .beneficial()
    .color(0x8FD8FF)
    .tag("world_combat:status/echoed_voice")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
