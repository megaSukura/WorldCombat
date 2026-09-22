// 灭亡之歌：歌声的身份。倒计时、结清与甩脱写在本单元的 skill.ts，按这个 tag 读到共享身份；
// 别的作者以后也能用 world_combat:status/perish_song 消费「已经入耳、数拍后倒下」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:perish_song")
    .harmful()
    .color(0x5A6BB0)
    .tag("world_combat:status/perish_song")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
