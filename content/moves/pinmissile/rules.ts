/**
 * 飞弹针的钉刺行为：把「身上钉了几根」翻成实际拖拽与可见针头。
 *
 * `world_combat:pinmissile_quills` 只借共享身份 `world_combat:status/quills`，行为全在这里写：
 *   按效果振幅（钉数）周期性续一条对应等级的减速（`minecraft:slowness`），钉得越多越慢；
 *   振幅由 skill.ts 在每次命中时 +1（上限 `pins`）并刷新时长，所以新针会一直把减速维持在较高档。
 *   同一节奏里用 `WorldFeedback.keep` 续上「身上针头数 = 实际层数」的持续表现：它由这个状态自己的
 *   tick 驱动，状态自然到期、被牛奶或 /effect clear 清除后不再续期，画面随之收掉，不会在驱散后继续播放。
 */
namespace PokemonSkills {
    WorldCombat.on("world_combat:move_pinmissile/quills", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== pinMissileQuills) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const effect = MobEffects.read(world, actor, pinMissileQuills);
        if (effect === null) return;
        world.marker(actor, "minecraft:slowness", 12, Math.min(2, effect.amplifier()));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_pinmissile/pinned:" + String(actor.ref()), pinMissileScene, 1, body.position(),
            { moment: "pinned", target: String(actor.ref()), count: effect.amplifier() + 1 }, 40);
    });
}
