/**
 * 草笛 / Grass Whistle —— 执行组织。
 *
 * 核心念头：含着一片草叶，一口气吹出一声又尖又长的哨音。声音沿「自身→目标」的直线笔直扎出去，穿过
 *   路上第一个目标、继续扎进它背后的敌人；实心墙挡住音束，但同伴的身体挡不住。一声就完，快而准——
 *   代价是这一声要么响、要么裂：每一次吹奏只掷一次骰子，裂了整条线都只剩走音。
 *
 * 幕：
 *   起（windup，提交前）：草叶含上、音孔亮起，只播预告。
 *   吹（beam → sleep / crack / immune / miss，提交后）：音束沿直线一次铺开；只掷一次 `landChance`：
 *     响了就把音束内通视的非友方按 `voices` 上限逐个挂上共享的 world_combat:status/sleep
 *     （宝可梦那一层同步成原生睡眠），裂了整条线只有一点走音。
 *
 * 反制：躲到墙后、绕开直线或站到射程之外；把身体挪出音束的半宽就听不到。它不吃草属性免疫（声音，不是粉末）。
 */
namespace PokemonSkills {
    function grasswhistleAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    define({
        id: grasswhistleId,
        cooldownParameter: "recharge",
        name: "草笛",
        description: "含一片草叶吹出一声笔直的哨音，沿「自身→目标」的直线穿过第一个目标、继续扎进它背后的敌人：整条音束里的人一起被这一声带走入睡。它要有没被墙挡住的直线，但同伴的身体挡不住声音；一声要么响要么裂，响不响由双方特攻与等级对抗决定。",
        uses: ["隔着同伴把成一条线的一串敌人一起放倒", "从远处压住一个正在拉开距离的威胁", "配合队友站位，让敌人排成一条线"],
        kind: "enemy",
        range: 10,
        maxRange: 16,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "whistle",
        defaults: { narrow: false },
        fields: [
            flag("narrow", "细笛")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[grasswhistleId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(grasswhistleId, "tempo", context)),
                recover: Math.round(p(grasswhistleId, "aftercast", context)),
                cooldown: Math.round(p(grasswhistleId, "recharge", context)),
                active: 1,
                range: p(grasswhistleId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, "sleep")) return "already-asleep";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("grasswhistle:windup:" + action.id(), grasswhistleScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", narrow: config && config.narrow === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[grasswhistleId], detail: { values: config } };
            return { radius: pokemon ? p(grasswhistleId, "reach", context) : 10, geometry: "line", style: "whistle", color: 0x7CC24E,
                label: config && config.narrow === true ? "草笛·细笛" : "草笛·阔音" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const target = action.target();
            const aimed = action.targetPosition();
            const offset = aimed.minus(origin);
            const direction = offset.length() < 0.05 ? action.direction() : offset.unit();
            const reach = Math.max(5, p(grasswhistleId, "reach", action));
            const half = Math.max(0.35, p(grasswhistleId, "laneWidth", action));
            const voices = Math.max(1, Math.round(p(grasswhistleId, "voices", action)));
            const sleepTicks = Math.max(60, Math.round(p(grasswhistleId, "sleepTicks", action)));
            const chance = Math.max(0.05, Math.min(0.98, p(grasswhistleId, "landChance", action)));
            const shrills = Math.max(3, Math.round(p(grasswhistleId, "shrills", action)));
            const noteSpeed = Math.max(1, p(grasswhistleId, "noteSpeed", action));
            const scale = Math.max(0.5, Math.min(2.0, half / 0.7));
            const ref = target === null ? "" : String(target.ref());
            const flow: number[] = [direction.x(), direction.y(), direction.z()];

            sound(action, "minecraft:block.note_block.flute");
            WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                { moment: "beam", path: [String(self.ref()), ref], direction: flow, lane: half, span: reach,
                  shrills: shrills, lines: shrills * 4, speed: noteSpeed, scale: scale }, 30);

            if (world.random() >= chance) {
                WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                    { moment: "crack", path: [String(self.ref()), ref], direction: flow, lane: half, shrills: shrills, scale: scale }, 22);
                WorldFeedback.text(world, grasswhistleAbove(origin), "world_combat.move.grasswhistle.text.crack", [Math.round(chance * 100)], 26);
                world.sound("minecraft:block.note_block.bass", origin, 12, "{}");
                done(action);
                return;
            }

            let landed = 0;
            const region = WorldGeometry.lane(origin, direction, reach, half, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (other: CombatActor) {
                if (landed >= voices) return;
                if (String(other.key()) === String(self.key())) return;
                const body = world.observe(other);
                if (body === null) return;
                if (!world.clear(origin, body.position())) return;
                if (CombatStatus.has(world, other, "sleep")) return;
                if (!CombatStatus.inflict(world, other, "sleep", sleepTicks)) {
                    WorldFeedback.emit(world, grasswhistleScene, 1, body.position(), { moment: "immune", target: String(other.ref()) }, 20);
                    return;
                }
                landed++;
                WorldFeedback.emit(world, grasswhistleScene, 1, body.position(),
                    { moment: "sleep", target: String(other.ref()), order: landed, shrills: shrills, lane: half, ticks: Math.round(sleepTicks / 20), scale: scale }, 30);
                WorldFeedback.text(world, grasswhistleAbove(body.position()), "world_combat.move.grasswhistle.text.sleep", [Math.round(sleepTicks / 20)], 28);
                world.sound("minecraft:entity.fox.sleep", body.position(), 14, "{}");
            });
            if (landed === 0) {
                WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                    { moment: "miss", path: [String(self.ref()), ref], direction: flow, lane: half, scale: scale }, 20);
                WorldFeedback.text(world, grasswhistleAbove(origin), "world_combat.move.grasswhistle.text.miss", [], 24);
            }
            done(action);
        }
    });
}
