/**
 * 诱惑 / Captivate — 执行组织。
 *
 * 核心念头：当场抬眸，把目光当作钩子——被盯住的异性对手心神一荡，大幅丧失特攻。它不飞、不铺地，
 *   只在看得见的地方生效；同性、掩体后与拉开的距离都是它天然的空门。献舞则把这份注视摊成一圈。
 *
 * 出手：短起手（windup 在施法者身上聚起暖粉色心绪）后提交；凝视不需要目标之外的任何实体。
 * 命中：目标挂共享的 world_combat:captivate_gaze（身份 world_combat:status/captivated），
 *       再 NativeEffects.boost 大幅下降特攻；宝可梦损失原生特攻等级，其他生物落到攻击属性（落于攻击阶梯）。
 * 视线：凝视要求 world.clear 通视，且宝可梦之间要求异性；其他生物没有性别，直接有效。
 * 献舞：以自身为圆心张开 ringRadius 的一圈，凡看得见、在圈内的非友方各迷住一次，最多 maxOnlookers 人。
 * 反制：同性宝可梦免疫、掩体后无效、距离超出 gazeRange 够不到；献舞要站进人堆里，起手与冷却都更长。
 */
namespace PokemonSkills {
    function captivateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 宝可梦之间要求异性；没有性别概念的原版生物、其他模组生物与玩家直接有效。 */
    function captivateAllows(world: CombatWorld, self: CombatActor, target: CombatActor): boolean {
        if (String(self.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return true;
        const a = String(CobblemonCombat.pokemon(self).gender()).toLowerCase();
        const b = String(CobblemonCombat.pokemon(target).gender()).toLowerCase();
        return a === "male" && b === "female" || a === "female" && b === "male" || a === "m" && b === "f" || a === "f" && b === "m";
    }

    /** 迷住一个目标：挂身份、扣特攻、播命中表现与浮字。 */
    function captivateCharm(world: CombatWorld, target: CombatActor, drop: number, duration: number): void {
        MobEffects.apply(world, target, captivateEffect, duration, 0);
        NativeEffects.boost(world, target, "spa", -drop);
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, captivateScene, 1, body.position(),
            { moment: "charm", target: String(target.ref()), drop: drop, hearts: 6 + drop * 8 }, 32);
        WorldFeedback.text(world, captivateAbove(body.position()), "world_combat.move.captivate.text.charm", [drop], 40);
    }

    define({
        id: captivateId,
        cooldownParameter: "recharge",
        name: "诱惑",
        description: "当场抬眸，用目光拉住一个异性对手并大幅降低它的特攻；同性宝可梦免疫，非宝可梦没有性别。也可以原地献舞，把周围看得见这份舞姿的非友方一起迷住。",
        uses: ["削弱法系威胁的特攻输出", "趁敌人聚拢时一次迷住几个", "在掩体多、弹道不好用的狭窄空间里施压"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "charm",
        defaults: { pose: "glance" },
        fields: [
            choice("pose", "姿态", ["glance", "dance"], ["回眸", "献舞"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[captivateId], detail: { values: config }, world, actor, attributes };
            const dance = !!(config && config.pose === "dance");
            return {
                prepare: Math.round(p(captivateId, "tempo", context)) + (dance ? 5 : 0),
                recover: p(captivateId, "recover", context),
                cooldown: Math.round(p(captivateId, "recharge", context) * (dance ? 1.3 : 1)),
                active: 1,
                range: p(captivateId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("captivate-windup", captivateScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dance: config && config.pose === "dance" ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const dance = !!(config && config.pose === "dance");
            return { radius: dance ? 2.6 : 6, geometry: dance ? "circle" : "line", style: "charm",
                label: dance ? "诱惑·献舞" : "诱惑" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(captivateId, "drop", action))));
            const duration = Math.max(80, Math.round(p(captivateId, "duration", action)));
            const dance = !!(config && config.pose === "dance");
            sound(action, "minecraft:block.amethyst_block.chime");
            if (dance) {
                const radius = Math.max(1.5, p(captivateId, "ringRadius", action));
                const cap = Math.max(1, Math.round(p(captivateId, "maxOnlookers", action)));
                let caught = 0;
                WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                    if (caught >= cap || facts.friendly()) return;
                    if (!world.clear(origin, facts.position())) return;
                    if (!captivateAllows(world, self, actor)) return;
                    captivateCharm(world, actor, drop, duration);
                    caught++;
                });
                WorldFeedback.emit(world, captivateScene, 1, origin,
                    { moment: "dance", radius: radius, caught: caught, drop: drop, hearts: 10 + caught * 14, scale: radius / 2.2 }, 36);
                if (caught > 0)
                    WorldFeedback.text(world, captivateAbove(origin), "world_combat.move.captivate.text.dance", [caught, drop], 40);
                done(action);
                return;
            }
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, captivateScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            if (!captivateAllows(world, self, target)) {
                const at = world.observe(target);
                const point = at === null ? action.targetPosition() : at.position();
                WorldFeedback.emit(world, captivateScene, 1, point, { moment: "immune", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, captivateAbove(point), "world_combat.move.captivate.text.immune", [], 32);
                done(action);
                return;
            }
            captivateCharm(world, target, drop, duration);
            done(action);
        }
    });

    // 迷醉存续期间，目标头顶持续浮起沉迷的心。
    WorldCombat.on("world_combat:move_captivate/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== captivateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "captivate:" + String(actor.ref()), captivateScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
