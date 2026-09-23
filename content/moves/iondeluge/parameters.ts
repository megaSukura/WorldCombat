/**
 * 等离子浴 / Ion Deluge — 参数与数值来源。
 *
 * 原生：Electric／Status／PP 25／优先度 +1／pseudoWeather iondeluge，持续 1 回合：
 *       场上一段时间内一般属性的招式变成电属性（对双方所有宝可梦）。
 * 世界化：在选定地面铺开一片带电粒子浴场——区域内任何人身上会挂一层短暂的「离子膜」；带着膜出招时，
 *         一般属性的招式在结算前变成电属性。于是它既是强化（自己的普通招吃电本系/打击面），
 *         也是干扰（对手的普通招也会变电，可能被地面免疫或电吸收特性吃掉）。走出浴场，膜很快脱落。
 *
 * 数值来源（都来自个体，分散在不同参数上）：
 *   fieldRadius   基础 3.0 格 + 特攻超出 50 的部分×0.012，再乘铺法系数，限幅 2~5.5
 *   fieldDuration 基础 200 刻 + 等级×4 刻，再乘铺法系数，限幅 140~480
 *   filmTicks     基础 12 刻 + 速度/400，限幅 8~20：离场后离子膜还贴多久
 *   ionDensity    基础 28 + 特攻/10，限幅 16~60：区域里带电粒子的密度
 * 配置项 wide 在“更大范围但更短”和“更小范围但更久”之间取舍，两个方向都要付出代价。
 */
namespace PokemonSkills {
    export const ionDelugeScene = "world_combat:move_iondeluge";
    export const ionField = "world_combat:iondeluge";
    export const ionFilm = "world_combat:ion_film";
    export const ionizeText = "world_combat.move.iondeluge.text.ionize";
    function ionWide(detail: any): boolean { return !!(detail && detail.values && detail.values.wide); }

    actionParameters.define("iondeluge", {
        fieldRadius: formula(F.base(3.0, "浴场半径")
            .plus(F.stat("specialAttack").minus(50).max(0).times(0.012).as("特攻"))
            .times(F.when(F.pref("wide"), F.const(1.3), F.const(0.85)).as("铺法"))
            .clamp(2, 5.5),
            "浴场半径", { unit: " 格", description: "等离子浴覆盖的半径；特攻越高越大，广域铺法 ×1.3、持久铺法 ×0.85。" }),
        fieldDuration: seconds(F.base(200, "浴场持续")
            .plus(F.level().times(4).as("等级"))
            .times(F.when(F.pref("wide"), F.const(0.7), F.const(1.4)).as("铺法"))
            .clamp(140, 480),
            "浴场持续", "浴场存在多久；广域铺法 -30%、持久铺法 +40%，并随等级延长。"),
        filmTicks: formula(F.base(12, "离子膜持续")
            .plus(F.stat("speed").div(400).as("速度"))
            .clamp(8, 20).round(),
            "离子膜持续", { unit: " 刻", description: "离开浴场后，身上的离子膜还停留多久；速度越快脱落越慢。" }),
        ionDensity: formula(F.base(28, "粒子密度")
            .plus(F.stat("specialAttack").div(10).as("特攻"))
            .clamp(16, 60).round(),
            "粒子密度", { unit: " 点", description: "浴场里带电粒子的密度；特攻越高铺得越密。" })
    });

    stages("iondeluge", [{ level: 30, values: { cooldown: 104 } }, { level: 50, values: { cooldown: 92 } }]);
    describe("iondeluge", [
        { key: "description.0", values: ["fieldRadius", "fieldDuration"] },
        { key: "description.1", values: ["filmTicks"] },
        { key: "wide.0", values: [], when: function (context) { return ionWide(context.detail); } },
        { key: "wide.1", values: [], when: function (context) { return !ionWide(context.detail); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
