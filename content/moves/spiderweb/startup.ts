// 蛛网的裹身载体：借共享身份 world_combat:status/trapped（别的单元可据此判断「被缠住、逃不掉」）。
// 逐层减速由 skill.ts 用 MobEffects.dynamicAttributes 按当前 carrier 的层数×本次 slow 统一写入移动/飞行属性，并让导航读同一个值；
// 这里不再固定减 0.35，避免与公式重复叠算。层数记在增幅等级里；火会让 skill.ts 把这个状态精确移除。
// identity_only：只借身份。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spiderweb_wrapped")
    .harmful()
    .color(0xE6E2D6)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
