// 偷懒：倦怠的身份载体。身份 `world_combat:status/loafing` 是本单元与别的单元、AI 读取「正在倦怠」的机读键；
// 只借身份、不带共享行为，移动减速由效果自带的原生属性修饰完成，起身的一幕写在 skill.ts 的效果移除监听里。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:loafing").harmful().color(0xC9A66B)
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:loafing", -0.22, "add_multiplied_total")
        .tag("world_combat:status/loafing").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
