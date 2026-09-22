/**
 * 起草 / trailblaze 的出手方式。
 *
 * 核心念头：借草木起势的一记窜跃。草叶在脚边一掀，整个人贴着地面窜出去，从对手身侧切过去；
 * 落地时脚步不停，轻快的步伐顺势把自己带得更快。空地上照样能跳，只是少了草叶那一份助力。
 *
 * 两幕：
 *   起（crouch，提交前）：屈膝压进脚边的草丛，草屑向脚下收拢；有草木时预告更亮。
 *   窜（leap → hit → boost）：提交后沿瞄准方向逐刻窜出，路上拖一条草绿轨迹；
 *       窜中目标结算伤害与击退，命中后提速（草丛起跳多一档）；落空则落地扬尘。
 *
 * 与同族分开：flamecharge 是直线火焰冲锋、aquastep 是多拍水舞，起草是**一次贴地的草绿窜跃**，
 * 起跳点的草木决定这一跳的分量。
 */
namespace PokemonSkills {
    const trailblazeScene = "world_combat:move_trailblaze";
    const trailblazeGrassText = "world_combat.move.trailblaze.text.grass";
    const trailblazeHasteText = "world_combat.move.trailblaze.text.haste";
    const trailblazeMissText = "world_combat.move.trailblaze.text.miss";

    function trailblazeHasteNow(current: CombatAction, stages: number): void {
        const world = current.world(), self = current.actor();
        NativeEffects.boost(world, self, "spe", stages);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, trailblazeScene, 1, body.position(), { moment: "boost", stages: stages }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), trailblazeHasteText, [stages], 34);
        world.sound("minecraft:block.grass.step", body.position(), 14, "{}");
    }

    define({
        id: "trailblaze",
        name: "起草",
        description: "跳出草丛进行攻击。通过轻快的步伐会提高自己的速度。",
        uses: ["从草木里窜出打一记措手不及", "借草丛起跳，一次换到更远的对手", "命中后提速，用新速度追下去"],
        kind: "enemy",
        range: 5,
        maxRange: 7,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 40,
        style: "leap",
        defaults: { overshoot: false, ai: { maxChase: 10, preferCover: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("trailblaze", "leap", pokemon) + 0.8, geometry: "line", style: "leap", color: 0x8CC63F, label: "起草" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["trailblaze"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("trailblaze", "crouch", context)),
                recover: Math.round(p("trailblaze", "landing", context)),
                cooldown: Math.round(p("trailblaze", "regroup", context)),
                active: 0,
                range: p("trailblaze", "leap", context) + 1.2
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense();
            const cover = trailblazeCoverOf(world, action.actor());
            action.present("world_combat:move_trailblaze:crouch", trailblazeScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", cover: cover, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const stride = p("trailblaze", "leap", action);
            const pace = p("trailblaze", "pace", action);
            const radius = p("trailblaze", "girth", action);
            const traceAhead = p("trailblaze", "traceAhead", action);
            const minimumMove = p("trailblaze", "minimumMove", action);
            const power = p("trailblaze", "strike", action);
            const haste = Math.max(1, Math.round(p("trailblaze", "haste", action)));
            const push = p("trailblaze", "push", action);
            const veil = Math.round(p("trailblaze", "veil", action));
            const cover = trailblazeCoverOf(world, actor);
            const overshoot = !!(config && config.overshoot);
            const direction = aim(action);
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const scale = stride / 3.4;
            const origin = action.origin();
            const landing = origin.plus(direction.scale(stride));
            const arc = origin.plus(direction.scale(stride / 2)).plus(WorldCombat.point(0, 1.1 + stride * 0.16, 0));
            // 起跳的整体预告：一条抬起的草绿弧线，玩家一眼看出这一跳会画到哪里。
            WorldFeedback.emit(world, trailblazeScene, 1, origin, {
                moment: "launch", cover: cover, veil: veil, scale: scale, intensity: intensity,
                bloom: cover ? veil : 0,
                path: [[origin.x(), origin.y(), origin.z()], [arc.x(), arc.y(), arc.z()], [landing.x(), landing.y(), landing.z()]]
            }, 26);
            sound(action, "minecraft:block.grass.break");
            if (cover) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), trailblazeGrassText, [], 24);
            let travelled = 0, struck = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function strikeNow(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), target = hit.target(), point = hit.position();
                const landed = impact(current, hit, "trailblaze", power, { damage: damageSpec("trailblaze", "strike"), contact: true });
                WorldFeedback.emit(scope, trailblazeScene, 1, point, { moment: "hit", cover: cover, veil: veil, scale: scale, intensity: intensity }, 30);
                sound(current, "minecraft:entity.player.attack.sweep");
                if (target !== null && scope.valid(target)) scope.displace(target, direction.scale(push));
                if (landed) trailblazeHasteNow(current, haste);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const step = Math.min(pace, Math.max(0, stride - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(here, here.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity() && !struck) {
                    struck = true;
                    strikeNow(current, hit);
                    if (!overshoot) { finish(current); return; }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= stride) {
                    if (!struck) {
                        const body = scope.observe(actor);
                        if (body !== null) {
                            WorldFeedback.emit(scope, trailblazeScene, 1, body.position(), { moment: "land", cover: cover, scale: scale }, 20);
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), trailblazeMissText, [], 22);
                        }
                    }
                    finish(current);
                    return;
                }
                WorldFeedback.keep(scope, "trailblaze:wake:" + String(actor.ref()), trailblazeScene, 1, here,
                    { moment: "wake", cover: cover, veil: veil, scale: scale }, 8);
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
