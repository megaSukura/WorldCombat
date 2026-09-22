// 腐蚀气体：一个只承载共享身份 world_combat:status/corroded 的可见状态，标记「刚被强酸毒雾裹过」还剩多久。
// 它本身不带行为，供别的作者按身份消费（例如对沾酸者追加效果）；溶毁道具由本单元 skill.ts 用原生持有物操作完成。
// 消费方用 CombatStatus.has(world, actor, "corroded") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:corroded").harmful().color(0x8FD24A)
        .tag("world_combat:status/corroded").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
