// 等离子浴：注册离子膜状态。只借共享身份 `world_combat:status/ionized`（本单元发明的身份），
// 行为写在本单元的 rules.ts：带着膜出一般属性招式时，那招在结算前变成电属性。启动脚本不引用服务端共享库。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:ion_film").beneficial().color(0x8FE8FF)
        .tag("world_combat:status/ionized").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
