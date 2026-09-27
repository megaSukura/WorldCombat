/**
 * 报仇 / retaliate —— 参数、伤害段与「同伴倒下」的记账。
 *
 * 原生事实：Normal／物理／威力 70／命中 100／PP 5／接触；
 *   「为倒下的同伴报仇。如果上一回合有同伴倒下，威力就会提高」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本招把「上一回合有同伴倒下」落成**眼前真的有人倒下**——任何一个与施法者同阵营
 *   的战斗者被打死的那一刻，附近 20 格内还活着的同伴都会带上「哀兵」状态（共享身份 world_combat:status/retaliate），
 *   并记住是谁下的手。带着这份哀兵之痛朝敌人撞上去时，这一记加重；命中后这口气就泄了。
 *   同伴关系与倒下位置来自 world_combat:actor_died 的观察者快照（event.actor 是活观察者，data.friendly 已判定阵营，
 *   data.position 是真实倒下点，data.sourceActor 是凶手）；只把哀兵发给 20 格内的观察者，不把全图共享成一场报仇。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   vengeance 报仇威力：物攻定狠度、等级补；带哀兵时乘以 `revenge`。
 *   revenge   加重倍率：等级与施法者与训练家的亲密度（1.8..2.4，最终威力有上限）。
 *   dash      冲撞距离：速度与等级；也是实际射程来源。
 *   charge    每刻位移：速度。
 *   collisionRadius 判定半径：身高。
 *   push      撞退：物攻。
 *   streaks   冲势线条数：物攻与等级，驱动表现。
 *   tempo／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 solemn（哀兵式）：冲得更远 ×1.12、翻倍系数 ×1.06（追着凶手打），但基础 ×0.92、起手 +3、冷却 +8；
 *   关闭＝直接式：基础 ×1.08、冲得短、收得干净。两向各有局面：追凶 vs 就地反击。
 */
namespace PokemonSkills {
    export const retaliateId = "retaliate";
    export const retaliateScene = "world_combat:move_retaliate";
    /** 共享身份：同伴倒下之后压在心里的那股劲。 */
    export const retaliateStatus = "retaliate";
    export const retaliateEffect = "world_combat:retaliate_mourning";
    export const retaliateHitText = "world_combat.move.retaliate.text.hit";
    export const retaliateRageText = "world_combat.move.retaliate.text.rage";
    export const retaliateMissText = "world_combat.move.retaliate.text.miss";
    /** 哀兵窗口与哀兵半径：同伴倒下的余波在场上停留多久、能传到多远（协议常量）。 */
    export const retaliateWindow = 160;
    export const retaliateRadius = 20;
    /** 每个哀兵记住的凶手，以及那名同伴真正倒下的位置（供 AI 追凶与起手「余光」读同一份事实）。 */
    var retaliateGrudges: { [ref: string]: string } = Object.create(null);
    var retaliateOrigins: { [ref: string]: { x: number; y: number; z: number } } = Object.create(null);
    /** 每个观察者已结算过的死亡 id；同一次倒下重复投递给同一观察者时只认第一次。 */
    var retaliateDeaths: { [ref: string]: string } = Object.create(null);

    /** 同伴倒下时记下的凶手 ref，没有则空串。 */
    export function retaliateGrudge(ref: string): string { return retaliateGrudges[ref] || ""; }

    /** 那名同伴真正倒下的位置（身体中心）；没有现场记录时返回 null。 */
    export function retaliateOrigin(ref: string): number[] | null {
        const origin = retaliateOrigins[ref];
        return origin === undefined ? null : [origin.x, origin.y, origin.z];
    }

    /** 这份哀兵结束（自然到期、被解除或替换）后，把它带来的凶手与倒下位置一并清掉，不留下失效锚。 */
    function retaliateForget(ref: string): void {
        delete retaliateGrudges[ref]; delete retaliateOrigins[ref]; delete retaliateDeaths[ref];
    }

    actionParameters.define(retaliateId, {
        /** 报仇威力：基础 70，物攻每比 60 多 1 加 0.3（夹 −14..32），等级每比 30 高 1 加 0.4（夹 −4..10）；带哀兵时乘以翻倍系数（等级与亲密度，1.8..2.4，哀兵式 ×1.06）、哀兵式 ×0.92、直接式 ×1.08；夹 40..185。 */
        vengeance: formula(
            F.base(70)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 32))
                .plus(F.level().minus(30).times(0.4).clamp(-4, 10))
                .times(F.when(F.status(retaliateStatus).gt(0),
                    F.base(2.0).plus(F.level().minus(30).times(0.005).clamp(-0.1, 0.25))
                        .plus(F.individual("friendship", text("worldcombat.skill.retaliate.value.bond")).minus(70).times(0.002).clamp(-0.06, 0.2))
                        .times(F.when(F.pref("solemn"), F.const(1.06), F.const(1)))
                        .clamp(1.8, 2.4).as(text("worldcombat.skill.retaliate.value.revenge")),
                    F.const(1)))
                .times(F.when(F.pref("solemn"), F.const(0.92), F.const(1.08)))
                .clamp(40, 185).round(1),
            "报仇威力", {
                unit: "威力",
                description: "这一记为同伴打出的基础威力；物攻越高越重、等级越高越稳。带着哀兵之痛时乘以翻倍系数（等级与施法者与训练家的亲密度越高越重，倍率 1.8..2.4，最终威力有上限）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲撞距离：基础 3.0 格，速度每比 60 快 1 加 0.02（夹 −0.5..1.4），等级每比 30 高 1 加 0.02（夹 −0.2..0.6）；哀兵式 ×1.12、直接式 ×0.9；夹 2.4..5.2。 */
        dash: formula(
            F.base(3.0).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.4))
                .plus(F.level().minus(30).times(0.02).clamp(-0.2, 0.6))
                .times(F.when(F.pref("solemn"), F.const(1.12), F.const(0.9)))
                .clamp(2.4, 5.2).round(2),
            "冲撞距离", {
                unit: "格",
                description: "朝目标撞出去的最大距离；腿快的个体冲得更远。它也是本招的实际射程来源。"
            }),
        /** 每刻位移：基础 0.75 格/刻，速度每比 60 快 1 加 0.004（夹 −0.12..0.34）；夹 0.55..1.25。 */
        charge: formula(
            F.base(0.75).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.12, 0.34)).clamp(0.55, 1.25).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "撞上去每刻移动的距离；越快越难被躲开。"
            }),
        /** 判定半径：基础 0.45 格，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.08..0.3）；夹 0.36..0.8。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.36, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "冲锋途中能撞到多大一圈；身板大的个体撞得更宽。"
            }),
        /** 撞退：基础 0.4 格，物攻每比 60 多 1 加 0.004（夹 −0.1..0.45）；夹 0.2..0.85。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.45)).clamp(0.2, 0.85).round(2),
            "撞退", {
                unit: "格",
                description: "被撞中的人沿冲锋方向被顶开的距离；力量越大顶得越远。"
            }),
        /** 冲势线条数：基础 12，物攻每比 60 多 1 加 0.2（夹 −3..26），等级每比 30 高 1 加 0.25（夹 −2..8）；夹 10..40。 */
        streaks: formula(
            F.base(12).plus(F.stat("attack").minus(60).times(0.2).clamp(-3, 26))
                .plus(F.level().minus(30).times(0.25).clamp(-2, 8)).clamp(10, 40).round(0),
            "冲势线条数", {
                unit: "条",
                description: "冲锋时拖出的速度线数量；物攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 起手：基础 6 刻，速度每比 60 快 1 减 0.02 刻（夹 −1..2），哀兵式 +3；夹 4..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("solemn"), F.const(3), F.const(0))).clamp(4, 11).round(0),
            "起手", "从压下哀痛到撞出去之间的时间；速度快的个体起得更快，哀兵式先沉住气。"),
        /** 收招：基础 8 刻；夹 4..14。 */
        settle: seconds(F.base(8).clamp(4, 14).round(0), "收招", "撞完收住的时间。"),
        /** 冷却：基础 28 刻，速度每比 60 快 1 减 0.12 刻（夹 −4..6），哀兵式 +8；夹 18..44。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(60).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("solemn"), F.const(8), F.const(0))).clamp(18, 44).round(0),
            "冷却", "这一记之后多久能再报仇；速度快的个体回得更快，哀兵式更费。")
    });

    defineDamage(retaliateId, "vengeance", {}, { contact: true });

    stages(retaliateId, [
        { level: 35, values: { vengeance: 88 } },
        { level: 52, values: { vengeance: 106, dash: 3.8 } }
    ]);

    describe(retaliateId, [
        { key: "description.0", values: ["vengeance"] },
        { key: "description.1", values: ["dash","charge","collisionRadius","push"] },
        { key: "description.additional", values: [] },
        { key: "solemn.on", values: [], when: function (context) { return read(context.detail.values, ["solemn"]) === true; } },
        { key: "solemn.off", values: [], when: function (context) { return read(context.detail.values, ["solemn"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.vengeance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.vengeance", "tier.1.dash"] }
    ]);

    // ---- 记账：同伴倒下的那一刻，看每个还活着的观察者的 actor_died 快照，把哀兵与凶手记在 20 格内的友方身上 ----
    // 事件按观察者逐个投递，event.actor 是活着的观察者；死者只出现在快照的 victim/position 里，不再 valid/observe 它。
    WorldCombat.on("world_combat:retaliate/fallen", "world_combat:actor_died", "", function (event) {
        const world = event.world(), observer = event.actor();
        if (!world.valid(observer)) return;
        const data = JSON.parse(String(event.data()));
        if (data.self === true || data.friendly !== true) return;
        const deathId = String(data.deathId || "");
        if (!deathId) return;
        const observerRef = String(observer.ref());
        if (retaliateDeaths[observerRef] === deathId) return;
        const position = data.position;
        if (!Array.isArray(position) || position.length !== 3 || !position.every(function (n: any) { return typeof n === "number" && isFinite(n); })) return;
        const at = WorldCombat.point(Number(position[0]), Number(position[1]), Number(position[2]));
        const body = world.observe(observer);
        if (body === null || body.position().minus(at).length() > retaliateRadius) return;
        retaliateDeaths[observerRef] = deathId;
        if (Object.keys(retaliateDeaths).length > 128) retaliateDeaths = Object.create(null);
        if (!CombatStatus.apply(world, observer, retaliateStatus, retaliateEffect, retaliateWindow, 0, { unique: true })) return;
        retaliateGrudges[observerRef] = String(data.sourceActor || "");
        retaliateOrigins[observerRef] = { x: at.x(), y: at.y(), z: at.z() };
    });

    // 哀兵载体结束（到期、牛奶、/effect clear 或被替换）后清掉这份账；仍带着同名效果时不误清。
    WorldCombat.on("world_combat:retaliate/forget", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== retaliateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, retaliateEffect) !== null) return;
        retaliateForget(String(actor.ref()));
    });
}
