/**
 * 水流裂破 / liquidation 的两个共享身份载体。
 *
 * 都是本单元自己的变体，只借身份、行为全由内容读写：
 * - `world_combat:liquidation_soaked` 带 `world_combat:status/soaked`，与波动冲（wavecrash）、水流尾
 *   （aquatail）的湿身是同一件事；消费方用 `CombatStatus.has(world, actor, "soaked")` 读到的是同一个身份。
 * - `world_combat:liquidation_sundered` 带 `world_combat:status/sundered`，表示护甲已被水刃撕开。
 *   这是本招发明的身份，别的单元以后可以直接消费它。
 * 两个都不镜像成 Cobblemon 原生异常——湿身与破甲都不是原生状态。
 */
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:liquidation_soaked")
        .harmful()
        .color(0x2F7FC4)
        .tag("world_combat:status/soaked")
        .tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:liquidation_sundered")
        .harmful()
        .color(0xD9A441)
        .tag("world_combat:status/sundered")
        .tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
