// 电网：被网缠住的共享身份 world_combat:status/netted。只借身份，行为写在本单元 skill.ts 里。
// 减速由入网那一下的共享速度等级（slowStages）承担，短定身由 pinTicks 的 rooted 承担；本状态本身不再改移速，
// 避免把「短缠足、可绕行」变成全程定身。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:electrowebbed")
    .harmful()
    .color(0xC7EEFF)
    .tag("world_combat:status/netted")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
