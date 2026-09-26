/**
 * 画龙点睛 / dragonascent 的参数与伤害段。本族「弃守强攻」唯一从天而降的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Flying／物理／威力 120／命中 100／PP 5／优先度 0／接触（distance 旗标）；
 *   self boosts { def: -1, spd: -1 }，无次要效果；target any。已实装学习者 1 位（Rayquaza）。描述
 *   「从天空中急速下降攻击对手。自己的防御和特防会降低」。
 *
 * 翻译：把「升空后从天而降砸下来」翻成即时战斗里的一次**垂直俯冲**——先窜上 `altitude` 高，再从正上方把整个
 *   身体砸向落点，落地一圈冲击波把周围的人一起震开。途中接触与落地共享本招的已命中集合：同一对象不会连吃两份满额。
 *   它是全族里唯一要走「升空」这一幕的招，高度与俯冲速度都写进参数；弃守的根据是「离了天、落地那一刻门户大开」——在提交那一刻付。
 *
 * 与同族分开：近身战贴脸连打、突飞猛扑贴地冲、铠农炮在远处；与勇鸟猛攻比：勇鸟从空中沿一条线水平穿过目标、
 *   能串起一串；画龙点睛是垂直下砸、落点一圈冲击波，只照顾落点附近，且必须先爬升。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   dive      坠落威力：物攻给力、速度给下坠的势头、等级拾级；广域式分薄。
 *   altitude  升空高度：速度决定窜得多快、身高决定体型撑起的高度（也是「起」这一幕的时长来源）。
 *   pace      每刻速度：速度决定爬升与俯冲多快。
 *   reach     水平接敌距离：速度决定在哪起跳；也是本招射程。
 *   ring      落地冲击半径：物攻与体重决定震波传多远。
 *   share     冲击保留：广域式波及到的其他目标留多少，物攻越高越均匀。
 *   shock     冲击击退：物攻决定把周围的人震开多远。
 *   motes     表现粒子量：物攻派生。
 *   guardLoss 自身防御下降级：原生固定 1 级；poiseLoss 同理。
 *   tempo/aftercast/recharge：速度定节奏，广域式更慢更长。
 *
 * 配置 `broad`（广域式，默认关）双向取舍：
 *   开＝落地冲击半径 ×1.3、击退 ×1.2；代价是坠落威力 ×0.88、收招 +3 刻、冷却 +4 刻。
 *   关（贯坠式）＝单点更重、出手更快、冲击更窄。
 *
 * 伤害段 `dive` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    export const dragonascentId = "dragonascent";

    actionParameters.define(dragonascentId, {
        /** 坠落威力：基础 120；物攻每比 60 多 1 加 0.9（夹 −26..55）；速度每比 55 快 1 加 0.25（夹 0..18）；
         *  等级每比 20 高 1 加 0.3（夹 0..18）；广域 ×0.88；夹 78..205。 */
        dive: formula(
            F.base(120)
                .plus(F.stat("attack").minus(60).times(0.9).clamp(-26, 55))
                .plus(F.stat("speed").minus(55).times(0.25).clamp(0, 18))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")), F.const(0.88), F.const(1.0)))
                .clamp(78, 205).round(1),
            "坠落威力", {
                unit: "威力",
                description: "从天上砸下来的那一下；物攻给力、下坠的速度也加成、等级越高越沉。广域式把力分薄，单点轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 升空高度：基础 2.2 格；速度每比 55 快 1 加 0.012（夹 −0.3..1.3）；身高每比 1.4 高 1 格加 0.5（夹 −0.2..0.8）；
         *  夹 1.6..3.6。 */
        altitude: formula(
            F.base(2.2)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 1.3))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .clamp(1.6, 3.6).round(2),
            "升空高度", {
                unit: "格",
                description: "先窜上多高再砸下来；快的个体窜得更高、大个子本身撑起得更多。头顶被压住时能升多少算多少。"
            }),
        /** 每刻速度：基础 0.55 格/刻；速度每比 55 快 1 加 0.004（夹 −0.1..0.35）；夹 0.4..1.0。 */
        pace: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.35)).clamp(0.4, 1.0).round(2),
            "每刻速度", {
                unit: "格/刻",
                description: "爬升与俯冲每刻走多少；速度越快，起落越干脆。"
            }),
        /** 水平接敌距离：基础 4.0 格；速度每比 55 快 1 加 0.03（夹 −0.5..2.0）；夹 3.0..7.0。 */
        reach: formula(
            F.base(4.0).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.5, 2.0)).clamp(3.0, 7.0).round(2),
            "水平接敌距离", {
                unit: "格",
                description: "在多远之内选它当落点；快的个体扑得更远。它也是本招的实际射程与指示线长度。"
            }),
        /** 俯冲碰撞半径：基础 0.5 格；宽每比 0.9 宽 1 格加 0.45（夹 −0.08..0.5）；高每比 1.4 高 1 格加 0.2（夹 −0.05..0.3）；
         *  夹 0.4..1.0。 */
        radius: formula(
            F.base(0.5)
                .plus(F.body("width").minus(0.9).times(0.45).clamp(-0.08, 0.5))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.3))
                .clamp(0.4, 1.0).round(2),
            "俯冲碰撞半径", {
                unit: "格",
                description: "俯冲时身体的碰撞半径；体型越大越容易蹭到人。判定与表现共用同一个半径。"
            }),
        /** 落地冲击半径：基础 1.9 格；物攻每比 60 多 1 加 0.012（夹 0..1.0）；体重每 10kg 比 60kg 加 0.004（夹 0..0.5）；
         *  广域 ×1.3 / 贯坠 ×0.85；夹 1.4..4.2。 */
        ring: formula(
            F.base(1.9)
                .plus(F.stat("attack").minus(60).times(0.012).clamp(0, 1.0))
                .plus(F.body("weight").div(10).minus(60).times(0.004).clamp(0, 0.5))
                .times(F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")), F.const(1.3), F.const(0.85)))
                .clamp(1.4, 4.2).round(2),
            "落地冲击半径", {
                unit: "格",
                description: "落地时冲击波荡开多大；物攻与体重决定传多远。画面里那圈尘环就是这个半径。"
            }),
        /** 冲击保留：广域式 = 0.45 − 物攻偏移[−0.12,0.15] / 贯坠式 = 0；夹 0..0.8。 */
        share: percent(
            F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")),
                F.base(0.45).minus(F.stat("attack").minus(60).times(0.0015).clamp(-0.12, 0.15)), F.const(0))
                .clamp(0, 0.8).round(2),
            "冲击保留", "落地冲击波波及到的其他目标保留多少威力；物攻越高越均匀。只有广域式有。"),
        /** 冲击击退：基础 0.5 格；物攻每比 60 多 1 加 0.006（夹 0..0.5）；广域 ×1.2；夹 0.3..1.6。 */
        shock: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.006).clamp(0, 0.5))
                .times(F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")), F.const(1.2), F.const(1.0)))
                .clamp(0.3, 1.6).round(2),
            "冲击击退", {
                unit: "格",
                description: "落地波把周围的人震开多远；物攻越高推得越远，广域式更猛。"
            }),
        /** 冲击点数：基础 16；物攻每比 60 多 1 加 0.12（夹 0..20）；夹 14..38。 */
        motes: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.12).clamp(0, 20)).clamp(14, 38).round(0),
            "冲击点数", {
                unit: "点",
                description: "落地崩起的尘与碎光量；物攻越高越炸得开。画面密度按它派生。"
            }),
        /** 自身防御下降级：原生固定 1 级；夹 1..6。 */
        guardLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身防御下降", {
                unit: "级",
                description: "离天落地后自身防御下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 自身特防下降级：原生固定 1 级；夹 1..6。 */
        poiseLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身特防下降", {
                unit: "级",
                description: "离天落地后自身特防下降的能力等级；原生固定 1 级，提交那一刻就付。"
            }),
        /** 起手：基础 12 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 8..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(8, 16).round(0),
            "起手", "屈腿蓄势、把身体压向地面的时间；速度越快越短。"),
        /** 收招：基础 12 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；广域 +3；夹 8..16。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")), F.const(3), F.const(0)))
                .clamp(8, 16).round(0),
            "收招", "落定后把身体撑起来、重新站稳的时间；广域式多震一下，收得更久。"),
        /** 冷却：基础 40 刻；速度每比 55 快 1 减 0.06（夹 −3..7）；广域 +4；夹 28..55。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 7))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.dragonascent.preference.broad")), F.const(4), F.const(0)))
                .clamp(28, 55).round(0),
            "冷却", "两次升空下砸之间等待多久；快的个体回气更快，广域式缓得更久。")
    });

    stages(dragonascentId, [
        { level: 30, values: { dive: 130, motes: 24 } },
        { level: 50, values: { dive: 148, altitude: 3.2 } }
    ]);

    defineDamage(dragonascentId, "dive", {}, { contact: true });

    describe(dragonascentId, [
        { key: "description.0", values: ["dive","ring"] },
        { key: "description.1", values: ["reach", "altitude", "pace", "radius"] },
        { key: "description.shock", values: [] },
        { key: "description.2", values: ["guardLoss","poiseLoss"] },
        { key: "broad.on", values: ["share","shock"], when: function (context) { return read(context.detail.values, ["broad"]) === true; } },
        { key: "broad.off", values: [], when: function (context) { return read(context.detail.values, ["broad"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dive"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dive", "tier.1.altitude"] }
    ]);
}
