// 沙暴：被沙砾覆住的状态载体。身份 `world_combat:status/sandstorm` 是本单元与别的单元共用的机读键；
// 只借身份、不带共享行为，磨蚀与特防写在 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:sandstorm_swept").harmful().color(0xD8B26A)
        .tag("world_combat:status/sandstorm").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
