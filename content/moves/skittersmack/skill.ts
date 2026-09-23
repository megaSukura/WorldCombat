/**
 * 爬击 / skittersmack —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：压低身体、前肢刮地、脚边泛起一圈将起未起的甲屑，只播预告。
 *   绕（scuttle，提交后）：贴地沿一条侧弧绕到目标的身后（`deepflank` 开则绕到真正的背后，关则贴着身侧掠过），
 *       轨迹由画面里的 `data.path` 与施法者身上的拖尾一起读出。
 *   拍（strike）：从落点回身拍出一记扫过 `smackWidth` 度的接触扇面，扇内每个敌人各结算一次伤害；
 *       被瞄准的目标绕到它背后时吃 `backstab` 加成，并把特攻降 `dropStages` 级（`NativeEffects.boost(..., "spa", -1)`，
 *       对宝可梦是原生特攻等级，对其他战斗者落到攻击阶梯）。目标跑开、绕行被挡或拍空都只留一记空挥。
 *
 * 与同族分开：十字剪是两刃在中轴交叉，神速是直线贯穿；爬击是唯一「绕到目标背后再出手」的一招，落点就是它的身份。
 */
namespace PokemonSkills {
    /** 把方向压平到水平面，零向量退化为 +Z。 */
    function skittersmackFlat(direction: CombatPoint): CombatPoint {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        return forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
    }
    /** 水平的左手侧方向。 */
    function skittersmackLateral(direction: CombatPoint): CombatPoint {
        const heading = skittersmackFlat(direction);
        return WorldCombat.point(-heading.z(), 0, heading.x());
    }
    /** 把一条世界轨迹收成表现用的顶点数组。 */
    function skittersmackVertices(points: CombatPoint[]): number[][] {
        const result: number[][] = [];
        for (let i = 0; i < points.length; i++) result.push([points[i].x(), points[i].y() + 0.1, points[i].z()]);
        return result;
    }

    define({
        freeMovement: true,
        id: skittersmackId,
        cooldownParameter: "recharge",
        name: "Skitter Smack",
        description: "贴地绕到目标身后，再从背后横扫一记：扇面内每个敌人各挨一次接触伤害并降低特攻，被指定的目标从背后挨打时还会额外吃一记背击加成。贴掠式掠过身侧、出手更快，但没有背击加成。",
        uses: ["从侧后绕过对手的正面防线", "在对手攻击别人时从背后补一记", "削弱法系威胁的特攻"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.6,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 20,
        style: "skitter",
        defaults: { deepflank: true, ai: { maxChase: 6 } },
        fields: [
            field(pathOf("deepflank"), "背击式", "boolean", {
                help: "开启：绕更远的弧到目标真正的背后，命中吃背击加成，代价是起手 +1 刻、冷却 +4 刻。关闭：贴着身侧掠过、出手更快，代价是没有背击加成、也只能从侧面出手。"
            })
        ],
        indicator: function (config, pokemon) {
            const deep = !(config && config.deepflank === false);
            return { radius: p(skittersmackId, "reach", pokemon), geometry: "line", style: "skitter",
                color: 0xA8C63A, label: deep ? "爬击·背击" : "爬击·掠击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[skittersmackId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(skittersmackId, "tempo", context)),
                recover: Math.round(p(skittersmackId, "aftercast", context)),
                cooldown: Math.round(p(skittersmackId, "recharge", context)),
                active: 0,
                range: p(skittersmackId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_skittersmack:scrape", skittersmackScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deepflank: !(config && config.deepflank === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selfActor: CombatActor = action.actor();
            const aimed: CombatActor | null = action.target();
            if (aimed === null || !world.valid(aimed) || world.friendly(aimed)) {
                WorldFeedback.emit(world, skittersmackScene, 1, action.targetPosition(), { moment: "miss" }, 16);
                done(action);
                return;
            }
            const foe: CombatActor = aimed;
            const self = world.observe(selfActor);
            const victim = world.observe(foe);
            if (self === null || victim === null) { done(action); return; }

            const approach = skittersmackFlat(victim.position().minus(self.position()));
            const lateral = skittersmackLateral(approach);
            const deep = !(config && config.deepflank === false);
            const scuttle = Math.max(0.8, p(skittersmackId, "scuttle", action));
            const pace = Math.max(0.3, p(skittersmackId, "pace", action));
            const standoff = Math.max(0.4, p(skittersmackId, "standoff", action));
            const reach = p(skittersmackId, "reach", action);
            const power = p(skittersmackId, "strike", action);
            const backstab = Math.max(0, p(skittersmackId, "backstab", action));
            const stages = Math.max(1, Math.round(p(skittersmackId, "dropStages", action)));
            const motes = Math.max(6, Math.round(p(skittersmackId, "motes", action)));
            const width = Math.max(40, Math.min(140, p(skittersmackId, "smackWidth", action)));
            const scale = Math.max(0.5, Math.min(2.4, (self.width() + self.height()) / 2.3));
            const maxFlank = 14;
            let sideSign = 1;
            const start = self.position();
            const sideA = victim.position().plus(lateral.scale(scuttle));
            if (!world.clear(start, sideA)) sideSign = -1;

            WorldFeedback.emit(world, skittersmackScene, 1, start,
                { moment: "scuttle", path: skittersmackVertices([start, victim.position().plus(lateral.scale(sideSign * scuttle)),
                    victim.position().plus(approach.scale(standoff))]), scale: scale, deepflank: deep ? 1 : 0 }, 26);
            sound(action, "minecraft:entity.silverfish.step");

            function strike(current: CombatAction, fromBehind: boolean): void {
                const scope = current.world();
                if (!scope.valid(foe)) { done(current); return; }
                const body = scope.observe(foe);
                if (body === null) { done(current); return; }
                const origin = current.origin();
                const facing = body.position().minus(origin);
                if (facing.length() > reach + 0.9) {
                    WorldFeedback.emit(scope, skittersmackScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), skittersmackMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    done(current);
                    return;
                }
                const direction = facing.length() < 1e-6 ? approach : facing.unit();
                const region = WorldGeometry.sector(origin, direction, reach + 0.9, width, { below: 1.6, above: 2.4 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy: CombatActor, facts: CombatObservation) {
                    if (String(enemy.ref()) === String(selfActor.ref())) return;
                    const primary = String(enemy.ref()) === String(foe.ref());
                    const bonus = primary && fromBehind ? 1 + backstab : 1;
                    if (!hurt(current, enemy, skittersmackId, power * bonus,
                        { damage: damageSpec(skittersmackId, "strike"), contact: true })) return;
                    NativeEffects.boost(scope, enemy, "spa", -stages);
                    hits++;
                    WorldFeedback.emit(scope, skittersmackScene, 1, facts.position(),
                        { moment: "strike", target: String(enemy.ref()), direction: [direction.x(), direction.y(), direction.z()],
                            motes: motes, back: primary && fromBehind ? 1 : 0, scale: scale,
                            intensity: Math.max(0.5, Math.min(2.2, power * bonus / 48)) }, 26);
                    if (!primary) return;
                    WorldFeedback.emit(scope, skittersmackScene, 1, facts.position(),
                        { moment: "focus", target: String(enemy.ref()), motes: motes, stages: stages, scale: scale }, 30);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        fromBehind ? skittersmackHitText : skittersmackFocusText, [stages], 30);
                });
                if (hits === 0) {
                    WorldFeedback.emit(scope, skittersmackScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), skittersmackMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.sweep");
                } else {
                    sound(current, "cobblemon:impact.bug");
                }
                done(current);
            }

            function flank(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                if (!scope.valid(foe)) { done(current); return; }
                const body = scope.observe(foe);
                const me = scope.observe(selfActor);
                if (body === null || me === null) { done(current); return; }
                const at = body.position();
                const past = WorldGeometry.dot(me.position().minus(at), approach);
                const behind = at.plus(approach.scale(standoff));
                const goal = past <= 0.15 ? at.plus(lateral.scale(sideSign * scuttle)) : behind;
                const want = goal.minus(me.position());
                if (want.length() <= 0.3 || elapsed >= maxFlank) { strike(current, past > standoff * 0.45); return; }
                const step = want.unit().scale(Math.min(pace, want.length()));
                const moved = scope.displace(selfActor, step);
                if (moved < 0.01) { strike(current, past > standoff * 0.45); return; }
                current.after(1, function (next: CombatAction) { flank(next, elapsed + 1); });
            }

            flank(action, 0);
        }
    });
}
