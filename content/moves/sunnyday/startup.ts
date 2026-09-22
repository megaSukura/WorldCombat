// 大晴天：晴暖状态的载体。身份 `world_combat:status/sunlit` 是本单元读取的机读键；
// 只借身份、不带共享行为，行为写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:sunnyday_sunlit").beneficial().color(0xFFB628)
        .tag("world_combat:status/sunlit").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
