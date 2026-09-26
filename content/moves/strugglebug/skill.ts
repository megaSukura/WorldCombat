/**
 * 虫之抵抗 / strugglebug —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：撑住身形、脚下泛起一圈将起未起的虫点，只播预告。
 *   涌（burst → wave，提交后）：虫群以施法者脚下为心、沿真实支撑地面向外推进。前缘由一圈射线组成，
 *       每条射线每刻用 `SurfacePaths.advance` 沿地面走出去，遇墙、断崖或悬空就停在该处——虫群不会
 *       隔墙扇拍，也不会在悬空处架桥。前缘扫到谁就把谁缠住：各结算一次 `swarm` 伤害、特攻降
 *       `dropStages` 级（只报实际降成功的级数），并实际施加 `world_combat:infested`（移动变慢）。
 *       只有该次状态真正挂上时，才创建一个跟随该目标的托管脚边虫带（`strugglebugCling`），被驱散立即散。
 *       同一目标只被扫到一次；飞在高处、不站真实地面上的目标不会凭上下圆柱被地虫抓到。
 *   散（settle）：虫群铺到 `radius` 后散去，只作画面。
 *
 * 施法者整段站定（`stationary` + 每刻 stopMovement），这就是「抵抗」的那一层：撑在原地把虫群推出去。
 * 与同族分开：本组只有它是自身范围、同时削到身边所有人，且缠身会拖着目标走不动。
 */
namespace PokemonSkills {
    // 脚边虫带：由真正挂上的 infested 载体创建。start 绑定载体 lease，每 tick 复核载体是否还在；
    // 牛奶／清除／替换后立即结束，画面随效果清理，不会比减速状态多留一刻。
    WorldCombat.effect(strugglebugCling, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid strugglebug cling: " + key);
        });
        if (value.motes < 0 || value.scale <= 0 || value.intensity <= 0) throw new Error("Invalid strugglebug cling");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(strugglebugCling, "start", function (effect) {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        data.lease = MobEffects.bind(world, target, strugglebugEffect);
        effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(strugglebugCling, "watch", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state()), body = world.observe(target);
        if (body === null || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "strugglebug:cling", strugglebugScene, 1, body.position(),
            { moment: "cling", target: String(target.ref()), motes: data.motes, scale: data.scale, intensity: data.intensity });
        effect.schedule("watch", "watch", 1, "{}");
    });

    define({
        id: strugglebugId,
        cooldownParameter: "recharge",
        name: "Struggle Bug",
        description: "撑住身形，把一团贴地的虫群从脚下向外推出去：虫群前缘沿真实地面爬开，扫到的每个敌人各挨一次特殊伤害、特攻下降，并被虫群实际缠住、移动变慢。虫群遇墙、遇断崖就停在原处，不会隔墙或隔空咬人。厚势式铺得更开更久，代价是伤害更低、出手更慢。",
        uses: ["被贴身围住时一次削到身边所有人", "把围上来的敌人一起拖慢", "对上多个法系威胁时一并压特攻"],
        kind: "self",
        range: 2.6,
        maxRange: 4.8,
        prepare: 7,
        active: 12,
        recover: 7,
        cooldown: 22,
        style: "swarm",
        stationary: true,
        defaults: { brood: true, ai: { maxChase: 7, minFoes: 2 } },
        fields: [
            field(pathOf("brood"), "厚势式", "boolean", {
                help: "开启：虫群扩散半径 ×1.2、缠身时长 ×1.3，代价是威力 ×0.85、起手 +2 刻、冷却 +4 刻，用来铺一片。关闭（疾涌式）：威力 ×1.12、扩散 ×1.15，节奏更快，但半径收到 ×0.85、缠身更短。"
            })
        ],
        indicator: function (config, pokemon) {
            const brood = !(config && config.brood === false);
            return { radius: p(strugglebugId, "radius", pokemon), geometry: "area", style: "swarm",
                color: 0x9FB13A, label: brood ? "厚势虫群" : "疾涌虫群" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[strugglebugId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(strugglebugId, "tempo", context)),
                recover: Math.round(p(strugglebugId, "aftercast", context)),
                cooldown: Math.round(p(strugglebugId, "recharge", context)),
                active: 12,
                range: p(strugglebugId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_strugglebug:brace", strugglebugScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", brood: !(config && config.brood === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selfActor: CombatActor = action.actor();
            const body = world.observe(selfActor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const ground = SurfacePaths.support(world, centre, 0.6, 1.6) || WorldGeometry.ground(world, centre, 3);
            const radius = Math.max(1.2, p(strugglebugId, "radius", action));
            const speed = Math.max(0.1, p(strugglebugId, "frontSpeed", action));
            const power = p(strugglebugId, "swarm", action);
            const stages = Math.max(1, Math.round(p(strugglebugId, "dropStages", action)));
            const cling = Math.max(20, Math.round(p(strugglebugId, "clingTicks", action)));
            const motes = Math.max(10, Math.round(p(strugglebugId, "motes", action)));
            const scale = radius / 2.6;
            const intensity = Math.max(0.5, Math.min(2.2, power / 34));
            const maxTicks = Math.ceil(radius / speed) + 8;
            const RAYS = 24;
            const caught: { [ref: string]: boolean } = Object.create(null);
            const rays: { heading: CombatPoint; point: CombatPoint; distance: number; ended: boolean }[] = [];
            for (let i = 0; i < RAYS; i++) {
                const angle = i * Math.PI * 2 / RAYS;
                rays.push({ heading: WorldCombat.point(Math.cos(angle), 0, Math.sin(angle)),
                    point: ground, distance: 0, ended: false });
            }
            const scenes = WorldFeedback.actionScenes(strugglebugScene, 1);
            let hits = 0;
            let reach = 0;

            sound(action, "minecraft:entity.silverfish.ambient");
            WorldFeedback.emit(world, strugglebugScene, 1, ground,
                { moment: "burst", radius: radius, scale: scale, motes: motes }, 20);

            function frontPoints(): CombatPoint[] { return rays.map(ray => ray.point); }

            function finish(current: CombatAction): void {
                const scope = current.world();
                scenes.stop(current);
                if (hits === 0) {
                    WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 1.2, 0)), strugglebugMissText, [], 24);
                    sound(current, "minecraft:entity.silverfish.hurt");
                }
                WorldFeedback.emit(scope, strugglebugScene, 1, ground,
                    { moment: "settle", radius: reach, path: frontPoints().map(point => [point.x(), point.y() + 0.05, point.z()]) }, 24);
                done(current);
            }

            function wrap(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                current.stopMovement();
                let active = 0;
                reach = 0;
                for (let i = 0; i < rays.length; i++) {
                    const ray = rays[i];
                    if (!ray.ended) {
                        const step = SurfacePaths.advance(scope, ray.point, ray.heading, speed,
                            { up: 1.0, down: 1.6, spacing: 0.3, samples: 6 });
                        ray.point = step.point;
                        const dx = ray.point.x() - ground.x(), dz = ray.point.z() - ground.z();
                        ray.distance = Math.sqrt(dx * dx + dz * dz);
                        if (step.ended || ray.distance >= radius) ray.ended = true;
                        else active++;
                    }
                    reach = Math.max(reach, ray.distance);
                }

                const outline = frontPoints();
                const region = WorldGeometry.polygon(outline, { below: 0.9, above: 0.9 });
                WorldGeometry.selectEnemies(scope, region, function (enemy: CombatActor, facts: CombatObservation) {
                    const ref = String(enemy.ref());
                    if (caught[ref] || ref === String(selfActor.ref())) return;
                    if (!facts.grounded()) return;
                    const feet = WorldCombat.point(facts.position().x(), facts.position().y() - facts.height() / 2, facts.position().z());
                    if (SurfacePaths.support(scope, feet, 0.5, 1.0) === null) return;
                    if (!scope.clear(ground.plus(WorldCombat.point(0, 0.3, 0)), feet)) return;
                    caught[ref] = true;
                    if (!hurt(current, enemy, strugglebugId, power, { damage: damageSpec(strugglebugId, "swarm") })) return;
                    hits++;
                    const dropped = NativeEffects.boost(scope, enemy, "spa", -stages);
                    const carrier = MobEffects.apply(scope, enemy, strugglebugEffect, cling, 0);
                    WorldFeedback.emit(scope, strugglebugScene, 1, facts.position(),
                        { moment: "hit", target: ref, motes: Math.max(8, Math.round(motes * 0.6)), stagger: cling,
                            scale: scale, intensity: intensity }, 24);
                    if (dropped !== 0) {
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                            strugglebugClingText, [-dropped], 28);
                    }
                    if (carrier !== null) {
                        scope.effect(strugglebugCling, enemy,
                            JSON.stringify({ motes: Math.max(10, Math.round(motes * 0.8)), scale: scale, intensity: intensity }), cling);
                    }
                });

                scenes.show(current, "wave", ground,
                    { moment: "wave", radius: reach, motes: motes, scale: scale, intensity: intensity,
                        path: outline.map(point => [point.x(), point.y() + 0.05, point.z()]) });

                if (active === 0 || reach >= radius - 0.01 || elapsed >= maxTicks) { finish(current); return; }
                current.after(1, function (next: CombatAction) { wrap(next, elapsed + 1); });
            }

            wrap(action, 0);
        }
    });
}
