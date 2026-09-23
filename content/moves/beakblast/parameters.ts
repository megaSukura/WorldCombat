/**
 * 鸟嘴加农炮 / beakblast 的参数、加热记号与接触灼伤监听。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Flying／物理／威力 100／命中 100／PP 15／优先度 −3／flags bullet（不接触）；
 *   `condition.duration: 1` 的 volatile `beakblast`：本回合先把鸟嘴烧热，**加热期间对施法者造成接触的招式**
 *   会让攻击者陷入灼伤（`source.trySetStatus("brn")`）；随后鸟嘴炮击目标。全招 1 位学习者（铳嘴大鸟）。
 *   原生描述「先加热鸟嘴后再进行攻击。鸟嘴在加热时对手触碰的话，就会使其灼伤」。
 *
 * 翻译：把回合制的「先加热→再攻击」翻成即时战斗里的一段**加热窗口 + 一发喙弹**。施法者提交后把鸟嘴烧到赤热，
 *   站定 `heat` 刻；这段时间里任何**用身体碰到它**的敌人都会被烫伤（走共享灼伤身份，宝可梦同步原生异常）；
 *   窗口走完，喙弹直线射出去结算 `shot` 伤害。它的辨识点是这个「加热窗口」——对手在窗口里可以躲开不碰它，
 *   也可以硬贴上来挨一次烫；窗口越长，炮越重，但越容易被惩罚。
 *
 * 与同族分开：神圣之火的火裹在自己身上、是俯冲；火焰球是踢出的实心火石；大字爆炎是一幅字。鸟嘴加农炮是
 *   唯一「先把自己烧热、再当炮管射出一发」的招，且加热窗口有接触灼伤的威慑；它是 Flying 物理、不接触。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shot      喙弹威力：物攻给炮劲、体重给出喙的分量、等级拾级抬升；赤热式更重。
 *   heat      加热时长：等级决定要烧多久；赤热式 ×1.5、速射式 ×0.7——窗口越长炮越重，但暴露越久。
 *   velocity  喙弹速度：速度决定弹丸飞得多急；赤热式射出更沉的弹。
 *   radius    喙弹判定：体型高度决定弹体大小。
 *   reach     射程：物攻决定炮能把喙弹送多远；赤热式收近一点。
 *   guard     加热接触半径：身高与宽度决定「贴到多近会被烫」；它就是画面里那圈热浪的半径。
 *   burnTicks 灼伤停留：物攻与等级决定被烫伤后烧多久。
 *   sparks    迸火数量：物攻换算，驱动表现。
 *   flames    嘴部火焰量：物攻换算，驱动加热表现的密度。
 *   tempo／aftercast／recharge：速度定节奏；赤热式更慢更贵。
 *
 * 配置 `forge`（赤热式，默认关）双向取舍：
 *   开（赤热式）：加热 ×1.5、喙弹威力 ×1.15、弹体更大，但喙弹飞得更慢、射程 −1 格、起手 +2 刻、冷却 +8 刻
 *     ——加热窗口越久越容易吃到接触灼伤的反击，也越难被躲。
 *   关（速射式）：加热 ×0.7、弹速 ×1.08、冷却 −6 刻，暴露窗口更短更安全，代价是喙弹威力 ×0.92。
 *
 * 伤害段 `shot` 与参数同名，原始类别 Physical（Flying）；bullet 标记沿用原生招式模板的 flags（被防弹特性挡下）。
 * 接触灼伤经共享状态路由落到攻击者身上。
 */
namespace PokemonSkills {
    export const beakblastEffect = "world_combat:beak_heat";
    /** 加热窗口的机读记号（带 guard／burnTicks／sparks），接触灼伤监听读它决定烫多重。 */
    export const beakblastMark = "world_combat:beak_heat_mark";
    export const beakblastScene = "world_combat:move_beakblast";
    export const beakblastHeatText = "world_combat.move.beakblast.text.heat";
    export const beakblastSearText = "world_combat.move.beakblast.text.sear";
    export const beakblastMissText = "world_combat.move.beakblast.text.miss";

    /** 一次来袭是否算「用身体碰到」：招式伤害带 contact；原版近战没有作者类别，由「造成者就是直接命中者」判定。 */
    function beakblastContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }

    function beakblastMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, beakblastMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    // 加热窗口的机读记号：只把 guard／burnTicks／sparks 传给监听与表现，不显示、不附带行为。
    WorldCombat.effect(beakblastMark, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.guard !== "number" || !isFinite(value.guard) || value.guard <= 0) throw new Error("Invalid beak guard");
        if (typeof value.burnTicks !== "number" || !isFinite(value.burnTicks) || value.burnTicks <= 0) throw new Error("Invalid beak burn");
        if (typeof value.sparks !== "number" || !isFinite(value.sparks) || value.sparks <= 0) throw new Error("Invalid beak sparks");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(beakblastMark, "start", function () { });
    WorldCombat.effectHandler(beakblastMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 加热期间用身体贴上施法者的敌人被烫伤：走共享灼伤身份，宝可梦那一层由共享库同步成原生异常。 */
    WorldCombat.on("world_combat:move_beakblast/sear", "world_combat:damage_incoming", "", function (event: CombatWorldEvent) {
        const world = event.world(), victim = event.target(), attacker = event.actor();
        if (victim === null || attacker === null || !world.valid(victim) || !world.valid(attacker)) return;
        if (String(attacker.key()) === String(victim.key())) return;
        if (!CombatStatus.has(world, victim, "beakblast")) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.amount > 0)) return;
        if (String(data.cause || "").indexOf("world_combat") === 0) return;
        if (!beakblastContact(data)) return;
        const from = world.observe(attacker), at = world.observe(victim);
        if (from === null || at === null) return;
        const mark = beakblastMarkOf(world, victim);
        const guard = mark !== null ? mark.guard : 3.2;
        if (from.position().minus(at.position()).length() > guard) return;
        const burnTicks = mark !== null ? mark.burnTicks : 800;
        const sparks = mark !== null ? Math.round(mark.sparks) : 14;
        const burned = CombatStatus.inflict(world, attacker, "burn", burnTicks);
        WorldFeedback.emit(world, beakblastScene, 1, from.position(),
            { moment: "sear", target: String(victim.ref()), sparks: sparks }, 30);
        if (burned) WorldFeedback.text(world, from.position().plus(WorldCombat.point(0, 1.3, 0)), beakblastSearText, [], 30);
    });

    actionParameters.define("beakblast", {
        /** 喙弹威力：基础 100；物攻每比 55 多 1 加 0.34（夹 −16..50）；体重每比 300 重 1 加 0.012（夹 −5..30）；
         *  等级每比 20 高 1 加 0.2（夹 0..12）；赤热 ×1.15 / 速射 ×0.92；夹 62..190。 */
        shot: formula(
            F.base(100).plus(F.stat("attack").minus(55).times(0.34).clamp(-16, 50))
                .plus(F.body("weight").minus(300).times(0.012).clamp(-5, 30))
                .plus(F.level().minus(20).times(0.2).clamp(0, 12))
                .times(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(1.15), F.const(0.92)))
                .clamp(62, 190).round(1),
            "喙弹威力", {
                unit: "威力",
                description: "赤热鸟嘴射出这一发的物理威力；物攻给炮劲、体重给出喙的分量、等级越高越沉。赤热式把炮烧得更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 加热时长：基础 34 刻；等级每比 25 高 1 加 0.8（夹 0..20）；赤热 ×1.5 / 速射 ×0.7；夹 18..80。 */
        heat: seconds(
            F.base(34).plus(F.level().minus(25).times(0.8).clamp(0, 20))
                .times(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(1.5), F.const(0.7)))
                .clamp(18, 80).round(0),
            "加热时长", "把鸟嘴烧到赤热要多久；这段时间里谁用身体碰到它就会被烫伤，而你自己站定挨打。等级越高烧得越久，赤热式 ×1.5、速射式 ×0.7。"),
        /** 喙弹速度：基础 1.6 格/刻；速度每比 55 快 1 加 0.008（夹 −0.25..0.6）；
         *  赤热 ×0.92 / 速射 ×1.08；夹 1.1..2.4。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.25, 0.6))
                .times(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(0.92), F.const(1.08)))
                .clamp(1.1, 2.4).round(2),
            "喙弹速度", {
                unit: "格/刻",
                description: "喙弹离开鸟嘴的速度；速度快的个体射得更急，赤热式的重弹稍慢、速射式的轻弹更快。"
            }),
        gravity: formula(F.const(0.004), "下坠", {
            unit: "格/刻²",
            description: "喙弹几乎直线飞行的一点下坠；炮口正对目标时基本可以忽略。"
        }),
        /** 喙弹判定：基础 0.22 格；身高每比 1.4 高 1 加 0.05（夹 −0.03..0.14）；赤热 ×1.1；夹 0.16..0.42。 */
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.14))
                .times(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(1.1), F.const(1)))
                .clamp(0.16, 0.42).round(2),
            "喙弹判定", {
                unit: "格",
                description: "喙弹飞行途中的判定半径；体型越高越大，赤热式的重弹更粗。"
            }),
        /** 射程：基础 14 格；物攻每比 55 多 1 加 0.05（夹 −2..4）；赤热 −1；夹 10..19。 */
        reach: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.05).clamp(-2, 4))
                .minus(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(1), F.const(0)))
                .clamp(10, 19).round(1),
            "射程", {
                unit: "格",
                description: "能把喙弹送到多远；物攻高打得远，赤热式的重弹收近一点。它也是本招的实际射程来源。"
            }),
        /** 加热接触半径：基础 1.6 格；身高每比 1.4 高 1 加 0.6（夹 −0.2..1.0）；宽度每比 0.9 宽 1 加 0.4（夹 −0.1..0.5）；
         *  夹 1.2..3.0。 */
        guard: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.2, 1.0))
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.5)).clamp(1.2, 3.0).round(2),
            "加热接触半径", {
                unit: "格",
                description: "加热期间贴到多近会被烫伤；身板越高越宽，赤热的鸟嘴护得越远。画面里那圈热浪就是这个半径——站进圈里用身体碰它就会被烧。"
            }),
        /** 灼伤停留：基础 600 刻；物攻每比 55 多 1 加 6（夹 −100..400）；等级每比 25 高 1 加 4（夹 0..200）；
         *  夹 400..1200。 */
        burnTicks: seconds(
            F.base(600).plus(F.stat("attack").minus(55).times(6).clamp(-100, 400))
                .plus(F.level().minus(25).times(4).clamp(0, 200)).clamp(400, 1200).round(0),
            "灼伤停留", "被烫伤的人身上的灼伤停留多久；物攻越高、等级越高烧得越久。走共享灼伤身份，宝可梦同步成原生异常。"),
        /** 迸火数量：基础 14；物攻每比 55 多 1 加 0.24（夹 −4..26）；夹 12..44。 */
        sparks: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.24).clamp(-4, 26)).clamp(12, 44).round(0),
            "迸火数量", {
                unit: "个",
                description: "接触烫伤与喙弹命中时迸出的火星数量；物攻越高越密，驱动表现。"
            }),
        /** 嘴部火焰量：基础 20；物攻每比 55 多 1 加 0.3（夹 −6..30）；夹 14..52。 */
        flames: formula(
            F.base(20).plus(F.stat("attack").minus(55).times(0.3).clamp(-6, 30)).clamp(14, 52).round(0),
            "嘴部火焰量", {
                unit: "个",
                description: "加热期间鸟嘴周围火焰与热浪的粒子量；物攻越高烧得越旺。"
            }),
        /** 起手：基础 8 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2.5）；赤热 +2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "抬起鸟嘴、把它对准目标的时间；速度越快越短，赤热式要多抬一下。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；夹 5..14。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(5, 14).round(0),
            "收招", "射完喙弹后收回站姿的时间；速度越快越利落。"),
        /** 冷却：基础 38 刻；速度每比 55 快 1 减 0.05（夹 −5..8）；赤热 +8 / 速射 −6；夹 24..54。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 8))
                .plus(F.when(F.pref("forge", text("worldcombat.skill.beakblast.preference.forge")), F.const(8), F.const(-6)))
                .clamp(24, 54).round(0),
            "冷却", "再次烧热鸟嘴前的等待；速度越快回得越快，赤热式蓄得更久。")
    });

    stages("beakblast", [
        { level: 40, values: { shot: 116, guard: 1.9 } },
        { level: 60, values: { shot: 132, heat: 44 } }
    ]);

    defineDamage("beakblast", "shot", {});

    describe("beakblast", [
        { key: "description.0", values: ["shot", "heat"] },
        { key: "description.1", values: ["guard", "burnTicks"] },
        { key: "description.2", values: ["reach", "velocity", "radius"] },
        { key: "forge.on", values: [], when: function (context) { return read(context.detail.values, ["forge"]) === true; } },
        { key: "forge.off", values: [], when: function (context) { return read(context.detail.values, ["forge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shot", "tier.0.guard"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shot", "tier.1.heat"] }
    ]);
}
