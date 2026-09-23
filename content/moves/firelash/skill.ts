/**
 * 火焰鞭 / firelash 的出手方式。本族「拆甲换力」的剥甲型——唯一让对手付防御代价的一招。
 *
 * 核心念头：**一条渐次亮起的火鞭**——先在手边点起火苗、把鞭梢拉长，再甩出去抽在目标身上；命中必然把目标的
 *   护甲烧软（防御 −1），鞭痕在落点留一小簇余火。它不让自己付代价，而是把对手的甲剥下来给后续攻击开路。
 *
 * 三幕（提交前只播预告）：
 *   起（kindle）：手边/尾端点起火苗、鞭身越拉越长、越亮，只播预告，此时代价未结清。
 *   抽（lash → hit / miss）：提交后朝目标甩出火鞭；鞭身沿一条上扬的弧线扫到目标。
 *       命中结算一次 `lash` 火焰接触伤害，并必然把目标防御下降 `melt` 级；鞭痕在落点留一簇余火。
 *       缠卷式（配置 entangle）额外把目标朝自己拖 `drag` 格并施加一段减速（minecraft:slowness）。
 *   收（bank）：火鞭收回、余火散去；命中浮字写明剥掉了几级防御。
 *
 * 与同族分开：蛮力/鳞射/鳞片噪音都是自己付防御，火焰鞭剥对手的甲；与强力鞭打分开——
 *   强力鞭打是草色、一道远而宽的横扫弧面；火焰鞭是火色、单目标的一条长鞭，鞭梢缠住落点把甲烧软。
 *
 * 配置 `entangle` 由公式改威力／射程／剥甲级，由本文件改拖拽与减速；提交后才触碰世界。
 */
namespace PokemonSkills {
    const firelashScene = "world_combat:move_firelash";
    const firelashMeltText = "world_combat.move.firelash.text.melt";
    const firelashBindText = "world_combat.move.firelash.text.bind";
    const firelashMissText = "world_combat.move.firelash.text.miss";

    /** 鞭身甩出的上扬弧线顶点；判定与表现共用同一条线的形状。 */
    function firelashArc(from: CombatPoint, to: CombatPoint): number[][] {
        const points: number[][] = [], steps = 6;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            points.push([
                from.x() + (to.x() - from.x()) * t,
                from.y() + (to.y() - from.y()) * t + Math.sin(t * Math.PI) * 0.45,
                from.z() + (to.z() - from.z()) * t
            ]);
        }
        return points;
    }

    define({
        id: "firelash",
        cooldownParameter: "recharge",
        name: "Fire Lash",
        description: "点起一条燃烧的长鞭甩向目标：单体物理火焰伤害，命中必然把目标防御烧降 1 级，为后续攻击开路。缠卷式把目标朝自己拖近并短暂减速、剥甲两级，代价是威力、鞭长与出手速度。",
        uses: ["中距离用一条火鞭剥掉对手防御，给后续攻击开路", "缠卷式把目标拖到身边再接一记近战", "对高防目标持续削甲"],
        kind: "enemy",
        range: 4.2,
        maxRange: 6.4,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 34,
        maximumTicks: 200,
        style: "lash",
        defaults: { entangle: false, ai: { maxChase: 8, strip: true, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("firelash", "reach", pokemon) : 4.2, geometry: "line", style: "lash",
                color: 0xE87722, label: config && config.entangle === true ? "火焰鞭·缠卷式" : "火焰鞭·鞭挞式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["firelash"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("firelash", "tempo", context)),
                recover: Math.round(p("firelash", "aftercast", context)),
                cooldown: Math.round(p("firelash", "recharge", context)),
                active: 0,
                range: p("firelash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_firelash:kindle", firelashScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", entangle: config && config.entangle === true ? 1 : 0,
                    reach: Math.round(p("firelash", "reach", action) * 10) / 10 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const origin = action.origin();
            const power = p("firelash", "lash", action);
            const reach = p("firelash", "reach", action);
            const melt = Math.max(1, Math.round(p("firelash", "melt", action)));
            const drag = p("firelash", "drag", action);
            const slowTicks = Math.max(0, Math.round(p("firelash", "slowTicks", action)));
            const entangle = !!(config && config.entangle);
            const scale = reach / 4.2;
            const intensity = Math.max(0.5, Math.min(2.2, power / 80));
            const embers = Math.round(12 + power * 0.3);

            sound(action, "cobblemon:move.firepunch.actor");
            WorldFeedback.emit(world, firelashScene, 1, origin,
                { moment: "kindle", embers: embers, intensity: intensity, scale: scale, entangle: entangle ? 1 : 0 }, 14);

            if (target === null || !world.valid(target)) {
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), firelashMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
                done(action); return;
            }
            const self = world.observe(actor);
            const tbody = world.observe(target);
            const from = self !== null ? self.position() : origin;
            const to = tbody !== null ? tbody.position() : action.targetPosition();
            const distance = to.minus(from).length();
            const path = firelashArc(from, to);

            WorldFeedback.emit(world, firelashScene, 1, to,
                { moment: "lash", path: path, embers: embers, intensity: intensity, scale: scale }, 20);

            if (distance > reach + 1.0) {
                WorldFeedback.emit(world, firelashScene, 1, to, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), firelashMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
                done(action); return;
            }

            const landed = hurt(action, target, "firelash", power, { damage: damageSpec("firelash", "lash"), contact: true });
            if (!landed) {
                WorldFeedback.emit(world, firelashScene, 1, to, { moment: "miss", scale: scale }, 16);
                sound(action, "minecraft:entity.player.attack.weak");
                done(action); return;
            }
            const targetRef = String(target.ref());
            NativeEffects.boost(world, target, "def", -melt);
            WorldFeedback.emit(world, firelashScene, 1, to,
                { moment: "hit", target: targetRef, embers: embers, intensity: intensity, scale: scale, melt: melt }, 20);
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.2, 0)), firelashMeltText, [melt], 30);
            sound(action, "cobblemon:impact.fire");

            if (entangle && world.valid(target)) {
                const body = world.observe(target);
                const here = body !== null ? body.position() : to;
                const toward = from.minus(here);
                if (toward.length() > 0.05 && drag > 0.05) world.displace(target, toward.unit().scale(drag));
                if (slowTicks > 0) world.marker(target, "minecraft:slowness", slowTicks, 1);
                WorldFeedback.emit(world, firelashScene, 1, here,
                    { moment: "bind", target: targetRef, drag: drag, slowTicks: slowTicks, embers: Math.round(embers * 0.7),
                        intensity: intensity, scale: scale }, 22);
                WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.3, 0)), firelashBindText, [], 26);
            }
            done(action);
        }
    });
}
