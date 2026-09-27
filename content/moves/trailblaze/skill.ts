/**
 * 起草 / trailblaze 的出手方式。
 *
 * 核心念头：借草木起势的一记窜跃。草叶在脚边一掀，整个人贴着地面窜出去，从对手身侧切过去；
 * 落地时脚步不停，轻快的步伐顺势把自己带得更快。空地上照样能跳，只是少了草叶那一份助力。
 *
 * 两幕：
 *   起（crouch，提交前）：屈膝压进脚边的草丛，草屑向脚下收拢；有草木时预告更亮。
 *   窜（leap → hit → boost）：提交后沿瞄准方向逐刻窜出，身体按「当前实际高度与起跳点之差」走一记短低弧，
 *       水平仍逐刻扫掠并每刻发出这一 tick 真实走过的子段；头顶压住时弧线降低；窜中目标结算伤害与击退
 *       （真的造成伤害才推人、才提速），穿草模式借 moveSweep 忽略已触及者继续合法余程（无新伤害）；
 *       落空且真正着地时才扬尘。
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
        // 读原生接受的实际增量：到顶／被拒绝时为 0，不假报提速、也不留视觉。
        const gained = NativeEffects.boost(world, self, "spe", stages);
        if (!(gained > 0)) return;
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, trailblazeScene, 1, body.position(), { moment: "boost", stages: gained }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), trailblazeHasteText, [gained], 34);
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
            // 只取水平朝向做窜跃；竖直那一份由身体按当前实际高度与起跳点之差逐刻补上。
            const direction = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const scale = stride / 3.4;
            const origin = action.origin();
            const startBody = action.sense().observe(actor);
            const startY = startBody !== null ? startBody.position().y() : origin.y();
            let apex = p("trailblaze", "arc", action);
            // 起跳：脚下草叶与速度线，不再预画整条弧线（弧线由每刻真实子段画出）。
            movementScenes.show(action, "launch", origin, {
                moment: "launch", cover: cover, veil: veil, scale: scale, intensity: intensity, arc: apex, bloom: cover ? veil : 0
            });
            sound(action, "minecraft:block.grass.break");
            if (cover) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), trailblazeGrassText, [], 24);
            let travelled = 0, struck = false, spent = false, settled = false, height = 0, airborne = false;
            const ignored: string[] = [];
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
                const body = scope.observe(actor);
                // 停止时没有真正着地就不画落地尘；没命中才报窜空。
                if (body !== null && body.grounded())
                    WorldFeedback.emit(scope, trailblazeScene, 1, at, { moment: "land", cover: cover, scale: scale, veil: veil, arc: apex }, 20);
                if (!struck) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), trailblazeMissText, [], 22);
                finish(current);
            }

            /** 身体逐接触：忽略已触及者，其余实体仍由原生碰撞拦下。返回 actual 与实际剩余。 */
            function sweepBody(current: CombatAction, delta: CombatPoint): { hit: CombatImpact; moved: number; remaining: CombatPoint } {
                const before = current.origin(), distance = delta.length();
                const hit = current.moveSweep(delta, radius, JSON.stringify(ignored));
                const moved = current.origin().minus(before).length();
                return { hit: hit, moved: moved, remaining: distance > 0 ? delta.unit().scale(Math.max(0, distance - moved)) : delta };
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const from = body.position();
                const step = Math.min(pace, Math.max(0, stride - travelled));
                if (step <= 0.001) { land(current, from); return; }
                const ratio = Math.min(1, (travelled + step) / stride);
                // 身体真的沿低弧抬起：水平逐刻扫掠，竖直按「目标弧高 − 当前实际高度」补差；头顶被压住就把弧降下来。
                let dy = apex * Math.sin(Math.PI * ratio) - height;
                dy = Math.max(-0.7, Math.min(0.7, dy));
                if (dy > 0.001) {
                    const feet = from.minus(WorldCombat.point(0, body.height() / 2, 0));
                    const probe = WorldCombat.point(feet.x(), feet.y() + dy, feet.z());
                    if (LivingActions.hasFreeSpace(scope) && !LivingActions.freeSpace(scope, probe, Math.max(0.3, body.width()), Math.max(0.5, body.height()))) {
                        apex = height; dy = 0;
                    }
                }
                if (Math.abs(dy) > 0.001) scope.displace(actor, WorldCombat.point(0, dy, 0));
                const climbed = scope.observe(actor);
                height = climbed !== null ? climbed.position().y() - startY : height;
                if (height > 0.05) airborne = true;
                if (ratio >= 0.5) movementScenes.stop(current, "launch");
                const swept = sweepBody(current, direction.scale(step)), hit = swept.hit;
                const after = scope.observe(actor);
                const to = after !== null ? after.position() : from;
                // 逐刻发当前真实子段：判定与表现共用身体这一 tick 的先后端点。
                if (to.minus(from).length() > 0.02)
                    movementScenes.show(current, "wake", from, { moment: "wake", cover: cover, veil: veil, scale: scale, arc: apex,
                        path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]] });
                if (hit.hitEntity()) {
                    if (spent) { land(current, to); return; }
                    spent = true;
                    const target = hit.target();
                    const landed = strikeNow(current, hit);
                    if (target !== null) ignored.push(String(target.ref()));
                    // 只有真正造成伤害才继续穿草余程；否则止步。后续余程靠忽略已触及者逐接触推进，不裸走剩余。
                    if (!landed || !overshoot) { land(current, hit.position()); return; }
                }
                travelled += swept.moved;
                if (hit.blocked() || swept.moved < minimumMove || travelled >= stride || (airborne && after !== null && after.grounded() && ratio >= 0.4)) {
                    land(current, to);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
