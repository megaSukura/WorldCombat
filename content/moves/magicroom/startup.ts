// 魔法空间的成员身份：站在静默空间里的活体带这个世界共有的身份 world_combat:status/magicroom。
// 道具压制由本单元 rules.ts 在成员身上叠加共享的 NativeModifiers suppressItems 层（自动到期／主动解除）；
// 消费方用 CombatStatus.has(world, actor, "magicroom") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:magicroom_gag")
    .beneficial()
    .color(0xC8D0E0)
    .tag("world_combat:status/magicroom")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
