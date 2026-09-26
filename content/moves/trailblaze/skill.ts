/**
 * 起草 / trailblaze 的出手方式。
 *
 * 核心念头：借草木起势的一记窜跃。草叶在脚边一掀，整个人贴着地面窜出去，从对手身侧切过去；
 * 落地时脚步不停，轻快的步伐顺势把自己带得更快。空地上照样能跳，只是少了草叶那一份助力。
 *
 * 两幕：
 *   起（crouch，提交前）：屈膝压进脚边的草丛，草屑向脚下收拢；有草木时预告更亮。
 *   窜（leap → hit → boost）：提交后沿瞄准方向逐刻窜出，身体按分段高度差抬起一记短低弧、水平仍逐刻扫掠，
 *       头顶压住时弧线降低；窜中目标结算伤害与击退（真的造成伤害才推人、才提速），落空则落地扬尘。
 *
 * 选取：kind 为 aim，可点选方向或实体、也可向空处空放；草木借势只读起跳点脚下的真实方块。
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
        freeMovement: true,
        id: "trailblaze",
        cooldownParameter: "regroup",
        name: "起草",
        description: "借草木的助力低低跃出的一记袭击：沿瞄准方向逐刻窜跳，撞上路径上第一个敌人造成伤害并把它带开，命中后自身速度提高一段；从草丛起跳时这一跳更重、提速更多。",
        uses: ["从草木里窜出打一记措手不及", "窜到较远的对手身前打一记措手不及", "命中后提速，用新速度追下去"],
        kind: "aim",
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
            const movementScenes = WorldFeedback.actionScenes(trailblazeScene);
            const world = action.world();
            const actor = action.actor();
            const stride = p("trailblaze", "leap", action);
            const pace = p("trailblaze", "pace", action);
            const radius = p("trailblaze", "girth", action);
            const minimumMove = p("trailblaze", "minimumMove", action);
            const power = p("trailblaze", "strike", action);
            const haste = Math.max(1, Math.round(p("trailblaze", "haste", action)));
            const push = p("trailblaze", "push", action);
            const veil = Math.round(p("trailblaze", "veil", action));
            const cover = trailblazeCoverOf(world, actor);
            const overshoot = !!(config && config.overshoot);
            // 只取水平朝向做窜跃；竖直那一份由身体按弧线逐刻抬起。
            const direction = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const scale = stride / 3.4;
            const origin = action.origin();
            const startBody = action.sense().observe(actor);
            const halfHeight = startBody !== null ? startBody.height() / 2 : 0.7;
            const landing = origin.plus(direction.scale(stride));
            const middle = origin.plus(direction.scale(stride / 2));
            let apex = p("trailblaze", "arc", action);
            const peak = WorldCombat.point(middle.x(), origin.y() + apex, middle.z());
            // 起跳的整体预告：一条到落点的短低弧，顶点就是身体真正会抬到的高度；有草木时才多卷一片草叶。
            movementScenes.show(action, "launch", origin, {
                moment: "launch", cover: cover, veil: veil, scale: scale, intensity: intensity, arc: apex,
                bloom: cover ? veil : 0,
                path: [[origin.x(), origin.y(), origin.z()], [peak.x(), peak.y(), peak.z()], [landing.x(), landing.y(), landing.z()]]
            });
            sound(action, "minecraft:block.grass.break");
            if (cover) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), trailblazeGrassText, [], 24);
            let travelled = 0, struck = false, settled = false, height = 0, airborne = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function strikeNow(current: CombatAction, hit: CombatImpact): boolean {
                const scope = current.world(), target = hit.target(), point = hit.position();
                const landed = impact(current, hit, "trailblaze", power, { damage: damageSpec("trailblaze", "strike"), contact: true });
                if (!landed) return false;
                WorldFeedback.emit(scope, trailblazeScene, 1, point, { moment: "hit", cover: cover, veil: veil, scale: scale, intensity: intensity }, 30);
                sound(current, "minecraft:entity.player.attack.sweep");
                if (target !== null && scope.valid(target)) scope.hitDisplace(target, direction.scale(push));
                trailblazeHasteNow(current, haste);
                return true;
            }

            function land(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                if (!struck) {
                    WorldFeedback.emit(scope, trailblazeScene, 1, at, { moment: "land", cover: cover, scale: scale, veil: veil, arc: apex }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), trailblazeMissText, [], 22);
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const from = body.position();
                const step = Math.min(pace, Math.max(0, stride - travelled));
                if (step <= 0.001) { land(current, from); return; }
                const ratio = Math.min(1, (travelled + step) / stride);
                // 身体真的沿低弧抬起：水平逐刻扫掠，竖直按分段高度差走；头顶被压住就把弧降下来。
                let dy = apex * Math.sin(Math.PI * ratio) - height;
                dy = Math.max(-0.7, Math.min(0.7, dy));
                if (dy > 0.001) {
                    const feet = from.minus(WorldCombat.point(0, body.height() / 2, 0));
                    const probe = WorldCombat.point(feet.x(), feet.y() + dy, feet.z());
                    if (LivingActions.hasFreeSpace(scope) && !LivingActions.freeSpace(scope, probe, Math.max(0.3, body.width()), Math.max(0.5, body.height()))) {
                        apex = height; dy = 0;
                    }
                }
                if (Math.abs(dy) > 0.001) height += scope.displace(actor, WorldCombat.point(0, dy, 0));
                if (height > 0.05) airborne = true;
                if (ratio >= 0.5) movementScenes.stop(current, "launch");
                const swept = sweepStep(current, direction.scale(step), radius), hit = swept.hit;
                if (hit.hitEntity() && !struck) {
                    struck = strikeNow(current, hit);
                    if (!overshoot) { finish(current); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                const after = scope.observe(actor);
                const grounded = after !== null ? after.grounded() : false;
                if (hit.blocked() || moved < minimumMove || travelled >= stride || (airborne && grounded && ratio >= 0.4)) {
                    land(current, after !== null ? after.position() : from);
                    return;
                }
                movementScenes.show(current, "wake", from, { moment: "wake", cover: cover, veil: veil, scale: scale, arc: apex, height: height });
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
