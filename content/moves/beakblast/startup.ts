// 鸟嘴加农炮：注册「鸟嘴赤热」状态。只借共享身份 world_combat:status/beakblast（状态词表里的 volatile），
// 行为写在本单元的 parameters.ts（接触灼伤监听），别的作者以后可以用同一个 tag 消费「鸟嘴已加热」。
// identity_only 表示不借任何共享默认行为；这里的状态本身只是加热窗口的可见标记。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:beak_heat").harmful().color(0xFF6A1E)
        .tag("world_combat:status/beakblast").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
