/**
 * 地狱翻滚 / submission 的两个共享身份载体。
 *
 * 都是本单元自己的变体，只借身份、行为由 skill.ts 读写：
 * - `world_combat:submission_grip` 带 `world_combat:status/partiallytrapped`，表示施法者已经贴身抓住了目标。
 *   它自带 movement_speed 归零，抓取窗口内被抓住的人和施法者都动不了；消费方用 `CombatStatus.has(world, actor, "partiallytrapped")` 读到同一身份。
 * - `world_combat:submission_pin` 带 `world_combat:status/pinned`，表示被摔倒在地、一时爬不起来。
 *   这是本招发明的身份，别的单元以后可以直接消费它。减速由效果自带的 movement_speed 修饰与 skill.ts 的导航监听共同表达。
 * 两个都不镜像成 Cobblemon 原生异常——抓取与倒地都不是原生状态。
 */
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:submission_grip")
        .harmful()
        .color(0x8A6B4A)
        .tag("world_combat:status/partiallytrapped")
        .tag("world_combat:status/identity_only")
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:submission_grip_speed", -1, "add_multiplied_total")
        .modifyAttribute("minecraft:generic.flying_speed", "world_combat:submission_grip_flying", -1, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:submission_pin")
        .harmful()
        .color(0xB08A5E)
        .tag("world_combat:status/pinned")
        .tag("world_combat:status/identity_only")
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:submission_pin_speed", -0.6, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
});
