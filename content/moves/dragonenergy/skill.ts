/**
 * 巨龙威能 / dragonenergy 的出手方式。
 *
 * 核心念头：把自身的生命力抽出来、顺着视线凝成一道龙息——起手时一缕缕生命光从身体汇到身前的龙首，
 * 再沿瞄准方向喷成一个真正的前向锥（可向上喷向高台）；锥里的人各挨一次龙威、被沿喷出的方向带走。
 * 满血时威能最盛，越虚弱越小；献祭式真的抽走自己的一部分生命来给这一喷加码。
 *
 * 三幕：
 *   汇（windup，提交前）：生命光沿瞄准方向从身体汇向身前，龙首越聚越亮；起手可被打断。
 *   喷（breath → hit）：提交后龙息填满整个 3D 锥面；锥内每个敌人各挨一次 `bolt`，被沿喷出方向推 `push`。
 *       献祭式在这一刻抽走最大生命的一部分（`lifeDraw`），并浮出一条抽血提示；威力在抽血之前快照。
 *       若这次抽血把施法者抽倒，本轮不再喷出，也不对已经结束的动作继续写回执。
 *   散（fade）：龙息在起点收成一小团残光散去，不拖出一条暗示持续命中的长尾。
 *
 * 判定与画面同源：锥长、张角、朝向来自同一组参数；受体用真实身体箱与锥体求交（WorldGeometry.bodyFrustum /
 * selectBodies），不再只测中心点；每个受体的命中另经真实块遮挡（world.clear）。画面把锥拆成若干可达分束，
 * 每束用 WorldGeometry.blockHit 截到真实墙面，所以墙后的锥面在视觉上同样截断，不是穿墙光。
 *
 * 这是本族唯一前向可瞄准的招，所以 `kind: "aim"`：方向、世界点或任意阵营实体都能放，允许空喷。
 */
namespace PokemonSkills {
    const dragonenergyScene = "world_combat:move_dragonenergy";
    const dragonenergyBeamScene = "world_combat:move_dragonenergy_beam";
    const dragonenergyHitText = "world_combat.move.dragonenergy.text.hit";
    const dragonenergyMissText = "world_combat.move.dragonenergy.text.miss";
    const dragonenergyDrainText = "world_combat.move.dragonenergy.text.drain";

    define({
        id: "dragonenergy",
        name: "Dragon Energy",
        description: "把自身的生命力凝成一道龙息，沿瞄准方向喷成一个前向的锥（可朝上空喷）：锥内所有敌人各挨一次龙威并被沿喷出方向带走，墙会截住龙息。威力随自身剩余血量下降，满血时最盛；献祭式额外抽走一部分生命来加码，若把自己抽倒则这一喷不再完成。",
        uses: ["朝一条线上的敌人一次贯穿", "在满血时打出最高的一记前向龙息", "把成列的敌人一起推出去", "用献祭式换一记拼命的爆发"],
        kind: "aim",
        range: 8,
        maxRange: 14,
        prepare: 16,
        active: 0,
        recover: 12,
        cooldown: 52,
        maximumTicks: 200,
        style: "dragonbreath",
        defaults: { sacrifice: false, ai: { maxChase: 12, line: true, sacrificeAbove: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonenergy", "coneLength", pokemon), geometry: "cone", style: "dragonbreath",
                color: 0xB06AE8, label: config && config.sacrifice === true ? "献祭龙威" : "巨龙威能" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["dragonenergy"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const sacrifice = !!(config && config.sacrifice);
            return {
                prepare: Math.round(p("dragonenergy", "chargeTicks", context) + (sacrifice ? 2 : 0)),
                recover: Math.round(p("dragonenergy", "recover", context)),
                cooldown: Math.round(p("dragonenergy", "cooldown", context) + (sacrifice ? 4 : 0)),
                active: skills["dragonenergy"].active,
                range: p("dragonenergy", "coneLength", context)
            };
        },
        windup: function (action, config, prepare) {
            const delta = action.targetPosition().minus(action.origin());
            const direction = delta.length() < 0.05 ? action.direction() : delta.unit();
            action.present("dragonenergy:charge", dragonenergyScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, focus: Math.round(p("dragonenergy", "focusCount", action)),
                    length: p("dragonenergy", "coneLength", action), angle: p("dragonenergy", "coneAngle", action),
                    direction: [direction.x(), direction.y(), direction.z()],
                    sacrifice: config && config.sacrifice === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const raw = aim(action);
            const axis = raw.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : raw.unit();
            action.face(origin.plus(axis.scale(4)), 22, 22);

            // 威力在献祭抽血之前快照：说明里的「原 HP 威力」与实际结算一致。
            const power = p("dragonenergy", "bolt", action);
            const length = Math.max(6, p("dragonenergy", "coneLength", action));
            const angle = Math.max(24, Math.min(64, p("dragonenergy", "coneAngle", action)));
            const half = Math.max(6, Math.min(80, angle / 2));
            const farRadius = Math.max(0.3, length * Math.tan(half * Math.PI / 180));
            const push = p("dragonenergy", "push", action);
            const focus = Math.max(14, Math.round(p("dragonenergy", "focusCount", action)));
            const sacrifice = !!(config && config.sacrifice);
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            let hits = 0;

            if (sacrifice) {
                const budget = Math.max(0.5, body.maxHealth() * Math.max(0.02, p("dragonenergy", "lifeDraw", action)));
                const drained = Math.max(0, -world.health(actor, -budget, "world_combat:life_force"));
                WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                    { moment: "drain", draw: Math.max(6, Math.min(60, Math.round(drained))), focus: focus,
                        direction: [axis.x(), axis.y(), axis.z()], scale: length / 8 }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)), dragonenergyDrainText, [], 22);
                // 抽血把自己抽倒时，动作已随死亡结束：不再喷出，也不回写任何本次动作的回执。
                if (!world.valid(actor) || world.observe(actor) === null) return;
            }

            // 受体用真实身体箱与同一个 3D 锥求交，不再只测中心点；每个命中另经真实块遮挡。
            WorldGeometry.selectBodies(world,
                WorldGeometry.bodyFrustum(origin, origin.plus(axis.scale(length)), 0.05, farRadius), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref()) || facts.friendly()) return;
                const at = facts.position();
                if (!world.clear(origin, at)) return;
                if (!hurt(action, enemy, "dragonenergy", power, { damage: damageSpec("dragonenergy", "bolt") })) return;
                hits++;
                if (world.valid(enemy)) world.hitDisplace(enemy, axis.scale(push));
                WorldFeedback.emit(world, dragonenergyScene, 1, at,
                    { moment: "hit", target: ref, count: Math.round(10 + focus * 0.4), scale: length / 8, intensity: intensity }, 24);
            });

            // 画面用可达分束：中轴加一圈靠近锥缘的射线，逐束用真实块碰撞截到墙面；喷出的一道填满实际可达锥长。
            const frame = WorldGeometry.basis(axis);
            const beamDirs: CombatPoint[] = [axis];
            const ringCount = 6, ringAngle = half * 0.8 * Math.PI / 180;
            for (let i = 0; i < ringCount; i++) {
                const a = i * Math.PI * 2 / ringCount;
                beamDirs.push(axis.scale(Math.cos(ringAngle))
                    .plus(frame.right.scale(Math.sin(ringAngle) * Math.cos(a)))
                    .plus(frame.up.scale(Math.sin(ringAngle) * Math.sin(a))).unit());
            }
            const paths: number[][][] = [];
            let clipped = length;
            for (let i = 0; i < beamDirs.length; i++) {
                const end = origin.plus(beamDirs[i].scale(length));
                const wall = WorldGeometry.blockHit(world, origin, end);
                const stop = wall !== null ? wall.position() : end;
                if (i === 0) clipped = Math.max(0.5, stop.minus(origin).length());
                paths.push([[origin.x(), origin.y(), origin.z()], [stop.x(), stop.y(), stop.z()]]);
            }

            WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                { moment: "breath", point: [origin.x(), origin.y(), origin.z()], direction: [axis.x(), axis.y(), axis.z()],
                    length: clipped, half: half, focus: focus, hits: hits, scale: clipped / 8, intensity: intensity,
                    sacrifice: sacrifice ? 1 : 0 }, 28);
            WorldFeedback.emit(world, dragonenergyBeamScene, 1, origin,
                { moment: "beams", paths: paths, direction: [axis.x(), axis.y(), axis.z()], length: clipped,
                    half: half, focus: focus, intensity: intensity, start: world.tick(), life: 22 }, 24);
            sound(action, "minecraft:entity.ender_dragon.shoot");
            sound(action, "cobblemon:impact.dragon");
            WorldFeedback.keep(world, "dragonenergy:fade:" + String(actor.ref()), dragonenergyScene, 1, origin,
                { moment: "fade", length: clipped, half: half, direction: [axis.x(), axis.y(), axis.z()],
                    focus: Math.round(focus * 0.5), scale: clipped / 8 }, 24);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)),
                hits > 0 ? dragonenergyHitText : dragonenergyMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
