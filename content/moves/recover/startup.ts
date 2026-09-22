// 自我再生：持续再生的身份载体。身份 `world_combat:status/regenerating` 是本单元与别的单元、AI 读取
// 「正在按刻再生」的机读键；只借身份、不带共享行为，逐刻交付与补满收势写在 skill.ts。
// 清除这个效果（牛奶／`/effect clear`）会立刻掐断剩下的再生，只留下已交付的部分。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:regenerating").beneficial().color(0x7FD8A0)
        .tag("world_combat:status/regenerating").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
