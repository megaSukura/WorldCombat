// 跺脚的「憋愤」凭据：共享身份 world_combat:status/stompingtantrum。只借身份，行为（带这口气时这一脚翻倍）
// 写在本单元 parameters.ts 的公式里；任何内容都能按身份问到「这个人上一次出手打空了」。
StartupEvents.registry("mob_effect", event => event.create("world_combat:stompingtantrum_frustration")
    .beneficial()
    .color(0xB5522E)
    .tag("world_combat:status/stompingtantrum")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
