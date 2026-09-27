// 力量戏法的保持窗口：只承载共享身份 world_combat:status/powertrick 的可见标记，标出「力道还翻着」的这段时间。
// 同时带上共享的攻防倒转身份 world_combat:status/attack_defence_inversion，供力量转换及其他内容按标签开放扩展地互斥。
// 真正的对调由本单元 skill.ts 写入共享 NativeModifiers stats 层（宝可梦）或 CombatCopies.equalize 的自有加性层（其他战斗者），
// 窗口走完或在窗口内再施展一次时，按机读记号翻回原样。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:powertrick_hold").category("neutral").color(0xE8843C)
        .tag("world_combat:status/powertrick").tag("world_combat:status/identity_only")
        .tag("world_combat:status/attack_defence_inversion")
        .effectTick((entity: any, amplifier: number) => { });
});
