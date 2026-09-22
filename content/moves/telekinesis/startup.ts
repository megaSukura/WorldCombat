// 意念移物的浮空窗口：只承载共享身份 world_combat:status/telekinesis 的可见标记。
// 压制（挪不动）由本单元 skill.ts 的机读记号落在移动属性上；免疫地面由同一文件的入场伤害规则负责。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:telekinesis_field").category("neutral").color(0x8A5CF0)
        .tag("world_combat:status/telekinesis").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
