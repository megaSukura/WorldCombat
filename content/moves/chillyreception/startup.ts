// 冷笑话：两个状态载体。
//  - `world_combat:chillyreception_snow`：落在雪区里的身体上，身份 `world_combat:status/snow`（与雪景共用）。
//  - `world_combat:cold_silence`：冷场身份，落在被笑话冻住的敌人上（身份 `world_combat:status/cold_silence`，
//    别的单元以后就能消费「正处于冷场」）。两者都只借身份、不带共享行为，行为写在 skill.ts / rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:chillyreception_snow").beneficial().color(0xEAF6FF)
        .tag("world_combat:status/snow").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
    e.create("world_combat:cold_silence").harmful().color(0x9AA8B8)
        .tag("world_combat:status/cold_silence").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
