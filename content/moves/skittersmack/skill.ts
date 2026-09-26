/** Move to a side waypoint, then the rear waypoint; only the victim's actual look at impact grants the back hit. */
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
        kind: "aim",
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
            const world = action.world(), actor = action.actor(), target = action.target(), self = world.observe(actor);
            if (!self) { done(action); return; }
            const victim = target && world.observe(target), start = action.origin(), aimed = aim(action);
            const facing = victim && target ? WorldGeometry.facing(world, target) : null;
            const forward = skittersmackFlat(facing || aimed), side = skittersmackLateral(forward);
            const deep = !(config && config.deepflank === false), scuttle = p(skittersmackId, "scuttle", action);
            const pace = p(skittersmackId, "pace", action), reach = p(skittersmackId, "reach", action);
            const standoff = p(skittersmackId, "standoff", action), power = p(skittersmackId, "strike", action);
            const backstab = p(skittersmackId, "backstab", action), stages = Math.round(p(skittersmackId, "dropStages", action));
            const motes = p(skittersmackId, "motes", action), width = p(skittersmackId, "smackWidth", action);
            const base = victim ? victim.position() : action.targetPosition();
            const sideSign = WorldGeometry.dot(start.minus(base), side) < 0 ? -1 : 1;
            const clearance = victim ? (self.width() + victim.width()) / 2 + standoff : standoff;
            const sideways = Math.max(scuttle, clearance);
            let phase: "side" | "rear" = "side", travelled = 0;
            const distanceBudget = scuttle * 2 + reach;
            const scenes = WorldFeedback.actionScenes(skittersmackScene);
            sound(action, "minecraft:entity.silverfish.step");
            function strike(current: CombatAction): void {
                scenes.stop(current);
                const scope = current.world(), origin = current.origin();
                const live = target && scope.valid(target) ? scope.observe(target) : null;
                const touch = live && target ? scope.closestPoint(target, origin) : current.targetPosition();
                const offset = touch.minus(origin), direction = offset.length() > 1e-6 ? offset.unit() : aimed;
                const look = live && target ? WorldGeometry.facing(scope, target) : null;
                const back = live ? skittersmackFlat(origin.minus(live.position())) : null;
                const behind = deep && look !== null && back !== null && WorldGeometry.dot(skittersmackFlat(look), back) < -0.35;
                let hits = 0;
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySector(origin, direction, reach, width, { below: 1.6, above: 2.4 }), (enemy, body) => {
                    if (String(enemy.key()) === String(actor.key()) || scope.friendly(enemy)) return;
                    const contact = scope.closestPoint(enemy, origin); if (!scope.clear(origin, contact)) return;
                    const primary = target !== null && String(enemy.ref()) === String(target.ref()), bonus = primary && behind ? 1 + backstab : 1;
                    if (!hurt(current, enemy, skittersmackId, power * bonus, { damage: damageSpec(skittersmackId, "strike"), contact: true })) return;
                    if (scope.valid(enemy)) NativeEffects.boost(scope, enemy, "spa", -stages);
                    hits++;
                    WorldFeedback.emit(scope, skittersmackScene, 1, contact, { moment: "strike", target: String(enemy.ref()),
                        direction: [direction.x(), direction.y(), direction.z()], motes: motes, back: primary && behind ? 1 : 0 }, 26);
                    WorldFeedback.text(scope, contact, primary && behind ? skittersmackHitText : skittersmackFocusText, [stages], 24);
                });
                if (!hits) {
                    WorldFeedback.emit(scope, skittersmackScene, 1, origin, { moment: "miss" }, 16);
                    WorldFeedback.text(scope, origin, skittersmackMissText, [], 20);
                }
                sound(current, hits ? "cobblemon:impact.bug" : "minecraft:entity.player.attack.sweep"); done(current);
            }
            function flank(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const body = target && scope.valid(target) ? scope.observe(target) : null;
                const centre = body ? body.position() : base;
                const desired = phase === "side" ? centre.plus(side.scale(sideSign * sideways)) : centre.minus(forward.scale(clearance));
                // A ground maneuver keeps its own foot height; looking at a tall boss does not launch the attacker upward.
                const goal = WorldCombat.point(desired.x(), here.y(), desired.z()), want = goal.minus(here);
                if (want.length() <= 0.3) {
                    if (phase === "side" && deep && body) { phase = "rear"; current.after(1, flank); return; }
                    strike(current); return;
                }
                const step = Math.min(pace, want.length(), distanceBudget - travelled);
                if (!(step > 0)) { strike(current); return; }
                const moved = scope.displace(actor, want.unit().scale(step)); travelled += moved;
                scenes.show(current, "scuttle", current.origin(), { moment: "scuttle",
                    path: skittersmackVertices([here, current.origin()]), deepflank: deep ? 1 : 0 });
                if (moved < 0.01 || travelled >= distanceBudget) { strike(current); return; }
                current.after(1, flank);
            }
            flank(action);
        }
    });
}
