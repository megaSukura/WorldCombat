// 再来一次：回声的身份。行为（原生招式锁定、提前散开、持续画面）写在本单元的 skill.ts，
// 按这个 tag 读到共享身份；别的作者以后也能用 world_combat:status/encore 消费「被点名」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:encore_call")
    .harmful()
    .color(0xF2C14E)
    .tag("world_combat:status/encore")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
