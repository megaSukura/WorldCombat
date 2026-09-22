// 清除之烟的「被烟罩住」标记：一个真实中性 MobEffect，对任何活体是同一个身份 world_combat:status/smogged，
// 只在烟罩住目标时挂上。真正把新加等级冲散的周期写在 skill.ts 的 world_combat:clear_smog_veil 里；
// 消费方用 CombatStatus.has(world, actor, "smogged") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:clear_smog")
    .category("neutral")
    .color(0x9AA88A)
    .tag("world_combat:status/smogged")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
