/**
 * 飞弹针的钉刺行为：把「身上钉了几根」翻成实际拖拽与可见针头。
 *
 * `world_combat:pinmissile_quills` 只借共享身份 `world_combat:status/quills`，行为分两处：
 *   - 减速由载体自身的移速贡献拥有（skill.ts 的 `MobEffects.fixedAttributes`）：随载体存亡，按振幅投影，
 *     3 针饱和，被清除/驱散后立即撤掉，不再反复续写一根外部 `minecraft:slowness`。
 *   - 针头表现由这里的 `world_combat:move_pinmissile_pinned` 自定义场景绘制：固定针位随身体附着、数量等于实际钉数；
 *     持续消息由这个状态自己的 tick 续期，状态自然到期、被牛奶或 `/effect clear` 清除后不再续期，画面随之收掉。
 */
namespace PokemonSkills {
    WorldCombat.on("world_combat:move_pinmissile/quills", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== pinMissileQuills) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const effect = MobEffects.read(world, actor, pinMissileQuills);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_pinmissile/pinned:" + String(actor.ref()), pinMissilePinnedScene, 1,
            body.position(), { moment: "pinned", target: String(actor.ref()), count: effect.amplifier() + 1 }, 24);
    });

    // 宝可梦的脚本导航读同一个载体：按实际钉数压低导航速度，与原生移速修饰同源，3 针饱和。
    WorldCombat.on("world_combat:move_pinmissile/slow", "world_combat:navigate", "", function (event) {
        const world = event.world(), actor = event.actor();
        const effect = MobEffects.read(world, actor, pinMissileQuills);
        if (effect === null) return;
        const factor = Math.max(0, 1 - pinMissileSlowPerPin * Math.min(3, effect.amplifier() + 1));
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * factor);
        event.data(JSON.stringify(data));
    });
}
