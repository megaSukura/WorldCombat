// 速度互换的交换窗口：一个只承载共享身份 world_combat:status/speedswap 的可见标记，
// 标出「换来的速度还在」的这段时间；真正把速度等级调回原处的行为写在本单元 skill.ts 里
// （读机读标记 world_combat:speedswap_mark），消费方用 CombatStatus.has(world, actor, "speedswap") 按身份读取。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:speedswap_shift").category("neutral").color(0x7FD8E8)
        .tag("world_combat:status/speedswap").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
