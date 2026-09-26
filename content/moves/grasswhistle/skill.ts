/**
 * 草笛 / Grass Whistle —— 执行组织。
 *
 * 核心念头：含着一片草叶，一口气吹出一声又尖又长的哨音。它沿任意选定的方向笔直扎出去，穿过路上第一个
 *   目标、继续扎进它背后的敌人；实心墙把音线截断在墙面，后段听不到，但同伴的身体挡不住声音。一声就完，
 *   快而准——代价是这一声要么响、要么裂：每一次吹奏只掷一次骰子，裂了整条线都只剩走音。
 *
 * 幕：
 *   起（windup，提交前）：草叶含上、音孔亮起，只播预告。
 *   吹（beam → sleep / crack / immune / miss，提交后）：音束沿直线一次铺开，可见长度就是墙截出的实际长度；
 *     只掷一次 `landChance`：响了就把音线内通视的非友方按离施法者的远近逐一带上共享的
 *     world_combat:status/sleep（宝可梦那一层同步成原生睡眠），各自独立结算免疫，直到 `voices` 上限；
 *     裂了整条线只有一点走音。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体、也可只给方向或世界点，空吹照吹（`target` 为 null 时沿提交朝向）。
 *   友方不挡线、也不吃这一声；墙截断后段。命中权限仍由共享状态/伤害层判断。
 *
 * 反制：躲到墙后、绕开直线或站到射程之外；把身体挪出音束的半宽就听不到。它不吃草属性免疫（声音，不是粉末）。
 */
namespace PokemonSkills {
    function grasswhistleAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    define({
        id: grasswhistleId,
        cooldownParameter: "recharge",
        name: "草笛",
        description: "含一片草叶吹出一声笔直的哨音，沿选定方向穿过第一个目标、继续扎进它背后的敌人：整条音线里的人一起被这一声带走入睡。它要有没被墙挡住的直线，实心墙会把音线截断在墙面，但同伴的身体挡不住声音；可以朝任意方向或世界点吹、也可以空吹。一声要么响要么裂，响不响由双方特攻与等级对抗决定。",
        uses: ["隔着同伴把成一条线的一串敌人一起放倒", "从远处压住一个正在拉开距离的威胁", "配合队友站位，让敌人排成一条线"],
        kind: "aim",
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
            // 自由朝向：没有选中实体（只给了方向/世界点）时照吹，不要求存在敌人。
            if (target === null) return "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
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
            const reach = Math.max(5, p(grasswhistleId, "reach", action));
            const half = Math.max(0.35, p(grasswhistleId, "laneWidth", action));
            const voices = Math.max(1, Math.round(p(grasswhistleId, "voices", action)));
            const sleepTicks = Math.max(60, Math.round(p(grasswhistleId, "sleepTicks", action)));
            const chance = Math.max(0.05, Math.min(0.98, p(grasswhistleId, "landChance", action)));
            const shrills = Math.max(3, Math.round(p(grasswhistleId, "shrills", action)));
            const noteSpeed = Math.max(1, p(grasswhistleId, "noteSpeed", action));
            const scale = Math.max(0.5, Math.min(2.0, half / 0.7));
            const flow = Math.max(0.06, Math.min(0.5, noteSpeed * 0.1));
            // 判定、音束长度与表现共用同一条水平音线：墙把线截断在真实首碰点，后段听不到。
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const full = origin.plus(direction.scale(reach));
            const wall = world.clipBlocks(origin, full);
            const end = wall !== null && wall.blocked() ? wall.position() : full;
            const span = Math.max(0.5, end.minus(origin).length());
            const heading = [direction.x(), direction.y(), direction.z()];
            const beamPath = [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];

            sound(action, "minecraft:block.note_block.flute");
            WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                { moment: "beam", path: beamPath, direction: heading, lane: half, span: span,
                  shrills: shrills, lines: shrills * 4, flow: flow, scale: scale }, 30);

            if (world.random() >= chance) {
                WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                    { moment: "crack", path: beamPath, direction: heading, lane: half, shrills: shrills, scale: scale }, 22);
                WorldFeedback.text(world, grasswhistleAbove(origin), "world_combat.move.grasswhistle.text.crack", [Math.round(chance * 100)], 26);
                world.sound("minecraft:block.note_block.bass", origin, 12, "{}");
                done(action);
                return;
            }

            // 同一声线里每个目标各自结算免疫/睡眠；被墙截断后按离施法者的远近依次带上，直到 voices 上限。
            let landed = 0;
            const region = WorldGeometry.lane(origin, direction, span, half, { below: 2, above: 3 });
            const listeners: { actor: CombatActor; point: CombatPoint; away: number }[] = [];
            WorldGeometry.select(world, region, function (other: CombatActor, facts: CombatObservation) {
                if (facts.friendly()) return;
                if (String(other.key()) === String(self.key())) return;
                listeners.push({ actor: other, point: facts.position(), away: facts.position().minus(origin).length() });
            });
            listeners.sort(function (a, b) { return a.away - b.away; });
            for (let i = 0; i < listeners.length; i++) {
                if (landed >= voices) break;
                const entry = listeners[i];
                if (!world.valid(entry.actor)) continue;
                if (CombatStatus.has(world, entry.actor, "sleep")) continue;
                if (!CombatStatus.inflict(world, entry.actor, "sleep", sleepTicks)) {
                    WorldFeedback.emit(world, grasswhistleScene, 1, entry.point, { moment: "immune", target: String(entry.actor.ref()) }, 20);
                    continue;
                }
                landed++;
                WorldFeedback.emit(world, grasswhistleScene, 1, entry.point,
                    { moment: "sleep", target: String(entry.actor.ref()), order: landed, shrills: shrills, lane: half, ticks: Math.round(sleepTicks / 20), scale: scale }, 30);
                WorldFeedback.text(world, grasswhistleAbove(entry.point), "world_combat.move.grasswhistle.text.sleep", [Math.round(sleepTicks / 20)], 28);
                world.sound("minecraft:entity.fox.sleep", entry.point, 14, "{}");
            }
            if (landed === 0) {
                WorldFeedback.emit(world, grasswhistleScene, 1, origin,
                    { moment: "miss", path: beamPath, direction: heading, lane: half, scale: scale }, 20);
                WorldFeedback.text(world, grasswhistleAbove(origin), "world_combat.move.grasswhistle.text.miss", [], 24);
            }
            done(action);
        }
    });
}
