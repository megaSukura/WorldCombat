/**
 * 屏障猛攻 / psyshieldbash 的护盾身份载体。
 *
 * 本单元自己的变体：带共享身份 `world_combat:status/psyshield` 与 `identity_only`，只借身份。
 * 机械效果是提交那一刻的 `NativeEffects.boost(..., "def", +N)`；这一层效果是“护盾还在身上”的可读标记，
 * 消费方用 `CombatStatus.has(world, actor, "psyshield")` 能读到，别的单元以后也可以消费。
 * 它不镜像成 Cobblemon 原生异常——这是本招自己发明的状态。
 */
StartupEvents.registry("mob_effect", event => event.create("world_combat:psyshieldbash_shell")
    .beneficial()
    .color(0xB36BFF)
    .tag("world_combat:status/psyshield")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
