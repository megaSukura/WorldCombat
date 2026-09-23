/**
 * 虫之抵抗 / strugglebug —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：撑住身形、脚下泛起一圈将起未起的虫点，只播预告。
 *   涌（burst → wave，提交后）：虫群以施法者脚下为心向外扩散，前缘每刻推进 `frontSpeed` 格；
 *       前缘扫到谁就把谁缠住——各结算一次 `swarm` 伤害、特攻降 `dropStages` 级
 *       （`NativeEffects.boost(..., "spa", -1)`），并挂上 `world_combat:infested`
 *       （共享身份 `world_combat:status/infested`，移动变慢）。同一目标只被扫到一次。
 *   散（settle）：虫群铺到 `radius` 后散去，只作画面。
 *
 * 施法者整段站定（`stationary` + 每刻 stopMovement），这就是「抵抗」的那一层：撑在原地把虫群推出去。
 * 与同族分开：本组只有它是自身范围、同时削到身边所有人，且缠身会拖着目标走不动。
 */
namespace PokemonSkills {
    define({
        id: strugglebugId,
        cooldownParameter: "recharge",
        name: "Struggle Bug",
        description: "撑住身形，把一团贴地的虫群从脚下向外推出去：虫群前缘扫到的每个敌人各挨一次特殊伤害、特攻下降，并被虫群缠住、移动变慢。厚势式铺得更开更久，代价是伤害更低、出手更慢。",
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
            const radius = Math.max(1.2, p(strugglebugId, "radius", action));
            const speed = Math.max(0.1, p(strugglebugId, "frontSpeed", action));
            const power = p(strugglebugId, "swarm", action);
            const stages = Math.max(1, Math.round(p(strugglebugId, "dropStages", action)));
            const cling = Math.max(20, Math.round(p(strugglebugId, "clingTicks", action)));
            const motes = Math.max(10, Math.round(p(strugglebugId, "motes", action)));
            const scale = radius / 2.6;
            const maxTicks = Math.ceil(radius / speed) + 4;
            const caught: { [ref: string]: boolean } = Object.create(null);
            let front = 0, hits = 0;

            sound(action, "minecraft:entity.silverfish.ambient");
            WorldFeedback.emit(world, strugglebugScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, motes: motes }, 20);

            function finish(current: CombatAction): void {
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)), strugglebugMissText, [], 24);
                    sound(current, "minecraft:entity.silverfish.hurt");
                }
                WorldFeedback.emit(scope, strugglebugScene, 1, centre,
                    { moment: "settle", radius: radius }, 24);
                done(current);
            }

            function wrap(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                current.stopMovement();
                const previous = front;
                front = Math.min(radius, front + speed);
                const region = WorldGeometry.ring(centre, Math.max(0, previous), front, { below: 1.8, above: 2.4 });
                WorldGeometry.selectEnemies(scope, region, function (enemy: CombatActor, facts: CombatObservation) {
                    const ref = String(enemy.ref());
                    if (caught[ref] || ref === String(selfActor.ref())) return;
                    caught[ref] = true;
                    if (!hurt(current, enemy, strugglebugId, power, { damage: damageSpec(strugglebugId, "swarm") })) return;
                    NativeEffects.boost(scope, enemy, "spa", -stages);
                    MobEffects.apply(scope, enemy, strugglebugEffect, cling, 0);
                    hits++;
                    WorldFeedback.emit(scope, strugglebugScene, 1, facts.position(),
                        { moment: "hit", target: ref, motes: Math.max(8, Math.round(motes * 0.6)), stagger: cling,
                            scale: scale, intensity: Math.max(0.5, Math.min(2.2, power / 34)) }, 24);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)),
                        strugglebugClingText, [stages], 28);
                });
                WorldFeedback.keep(scope, "strugglebug:wave:" + String(current.id()), strugglebugScene, 1, centre,
                    { moment: "wave", radius: front, motes: motes }, 20);
                if (front >= radius - 0.001 || elapsed >= maxTicks) { finish(current); return; }
                current.after(1, function (next: CombatAction) { wrap(next, elapsed + 1); });
            }

            wrap(action, 0);
        }
    });
}
