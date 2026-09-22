// 水波刀的湿身载体。
//
// `world_combat:aquacutter_soaked` 带共享身份 `world_combat:status/soaked`，与水流尾（aquatail）、波动冲（wavecrash）、
// 水流裂破（liquidation）、贝壳刃（razorshell）的湿身是同一件事：消费方用 `CombatStatus.has(world, actor, "soaked")`
// 读到的是同一个身份。带 `world_combat:status/identity_only`：只借身份，行为全由内容读写（这里湿身本身是标记）。
// 不镜像成 Cobblemon 原生异常——湿身不是原生状态。
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:aquacutter_soaked")
        .harmful()
        .color(0x2E9BD6)
        .tag("world_combat:status/soaked")
        .tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
