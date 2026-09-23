/**
 * 芳香治疗 / Aromatherapy —— 执行组织。
 *
 * 核心念头：把一阵沁人的香气送到一个地方，香不散，就地漫成一片会停留的香云；走进云里的伙伴被香气裹住，
 *   身上有任何有害状态效果都被当场化掉。它是**一块地方**——可以提前铺在队友会经过的路上，也可以在缠斗点上反复净化；
 *   云还在的时候，谁再被挂上异常都会被它继续化掉。与「治愈铃声」那一下当场全清分开：铃声是一瞬，香云是一段。
 *
 * 两幕：
 *   起（windup，提交前）：手心拢起一捧香，只观察与预告，可被打断。
 *   铺（提交后）：香云落在选定点，半径 scentRadius、停留 cloudTicks；云每 5 刻扫一次，
 *     把云里每个友善战斗者身上的全部有害状态效果化掉（有才化，没有就不动），并续播画面。
 *
 * 反制：绕开那片云即可躲过净化；云只在落点一小片、有时间限制，把队友带出云外或等它散去都能让净化落空。
 * 宝可梦层：化掉的是共享默认效果，原生队伍面板随之同步；本招不新增状态。
 */
namespace PokemonSkills {
    function aromatherapyAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 化掉一个战斗者身上的全部有害状态效果，返回实际化掉的项数。 */
    function aromatherapyCleanse(world: CombatWorld, actor: CombatActor): number {
        return CombatStatus.cureHarmful(world, actor);
    }

    // 香云行为：stay 每 5 刻对云里的友善战斗者净化一次；scan 只负责续播画面。
    WorldEffects.fieldRule(aromatherapyField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            const removed = aromatherapyCleanse(world, actor);
            if (removed <= 0) return;
            const body = world.observe(actor);
            if (body === null) return;
            const motes = Math.max(10, Math.round(Number(field.data.motes) || 18));
            const scale = Math.max(0.6, Math.min(1.8, motes / 26));
            world.sound("minecraft:block.sweet_berry_bush.pick_berries", body.position(), 10, "{}");
            WorldFeedback.emit(world, aromatherapyScene, 1, body.position(),
                { moment: "cleanse", target: String(actor.ref()), removed: removed, motes: motes, scale: scale }, 24);
            WorldFeedback.text(world, aromatherapyAbove(body.position()), aromatherapyCleanseText, [removed], 26);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            const motes = Math.max(10, Math.round(Number(field.data.motes) || 18));
            WorldFeedback.keep(world, "aromatherapy:cloud:" + String(effect.id()), aromatherapyScene, 1, centre,
                { moment: "cloud", radius: field.radius, motes: motes, scale: field.radius / aromatherapyReferenceRadius }, 12);
        }
    });

    define({
        id: aromatherapyId,
        cooldownParameter: "recharge", name: "芳香治疗",
        description: "在选定点铺下一片会停留的香云：云里的自己与伙伴身上的全部有害状态效果会被反复化掉，云还在时新挂上的异常也继续被化掉；绕开这片云就能躲过净化。",
        uses: ["在队友据守或缠斗的位置铺一片香云", "提前把香云铺在队友会经过的路上", "队友扎堆时用一片云反复净化整片区域"],
        kind: "point", range: 5, maxRange: 8, prepare: 11, active: 1, recover: 8, cooldown: 160, style: "scent", maximumTicks: 220,
        defaults: { dense: false },
        fields: [flag("dense", "浓香")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[aromatherapyId], detail: { values: config } };
            return { radius: p(aromatherapyId, "scentRadius", context), geometry: "area", style: "scent", color: 0xF6C7E0,
                label: config && config.dense === true ? "芳香治疗 · 浓香" : "芳香治疗 · 弥香" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aromatherapyId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aromatherapyId, "tempo", context)),
                recover: Math.round(p(aromatherapyId, "aftercast", context)),
                cooldown: Math.round(p(aromatherapyId, "recharge", context)),
                active: 1, range: p(aromatherapyId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aromatherapy:windup", aromatherapyScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config && config.dense === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor();
            const origin = action.origin(), centre = action.targetPosition();
            const radius = Math.max(1.5, p(aromatherapyId, "scentRadius", action));
            const ticks = Math.max(80, Math.round(p(aromatherapyId, "cloudTicks", action)));
            const motes = Math.max(10, Math.round(p(aromatherapyId, "motes", action)));
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            const scale = radius / aromatherapyReferenceRadius;
            WorldEffects.field(world, aromatherapyField, centre, radius, { motes: motes }, ticks);
            world.sound("cobblemon:move.spore.actor", origin, 16, "{}");
            WorldFeedback.emit(world, aromatherapyScene, 1, origin,
                { moment: "release", target: String(self.ref()), direction: [direction.x(), direction.y(), direction.z()],
                    distance: distance, motes: motes, radius: radius, scale: scale }, 26);
            world.sound("minecraft:block.pink_petals.place", centre, 14, "{}");
            WorldFeedback.emit(world, aromatherapyScene, 1, centre,
                { moment: "settle", radius: radius, motes: motes, scale: scale }, 30);
            WorldFeedback.text(world, aromatherapyAbove(centre), aromatherapySettleText, [Math.round(ticks / 20)], 28);
            done(action);
        }
    });
}
