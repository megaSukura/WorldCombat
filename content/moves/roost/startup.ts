// 羽栖：落地休息的身份载体。身份 `world_combat:status/roosting` 是本单元与别的单元、AI 读取「正在落地栖息」的
// 机读键；只借身份、不带共享行为，回复分段与属性改写写在 skill.ts。清除这个效果会提前结束栖息（按已交付的比例结算）。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:roosting").beneficial().color(0xE8D9A8)
        .tag("world_combat:status/roosting").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
