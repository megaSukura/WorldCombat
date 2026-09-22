/**
 * 诱惑 / Captivate 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 allAdjacentFoes（原作同时作用相邻敌人）／
 *       onTryImmunity 要求双方为异性／boosts={spa:-2}（大幅降低特攻）。
 * 世界化：这不是隔空扣等级，而是**当场抬眸**——目光沿直线拉住一个看得见的对手，把它拽进你的注视里。
 *   凝视不需要飞行的东西，因此不会被掩体之外的走位躲开；代价是只认一个目标、且要求异性（宝可梦之间）。
 *   原版生物、其他模组生物与玩家没有性别，直接有效。命中后先挂共享身份 world_combat:status/captivated
 *   的真实 MobEffect，再调用 NativeEffects.boost 大幅下降特攻：宝可梦损失原生特攻等级，其他生物落到攻击属性。
 * 「回眸」只盯住选中的敌人，起手短；「献舞」在原地旋开一圈，把看得见这份舞姿的敌人一起卷进来，
 *   但起手更慢、冷却更长，且必须让自己身陷人群。性别与视线都是对手可利用的地方：同性、躲到墙后、拉开距离。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop          施法者特攻 ≥ 110 时从 2 级升到 3 级；心神越强，夺走对手的特攻越多。
 *   duration      160 刻 + 亲密度 × 1.2，夹 160..380；越亲近的施法者越能把对方的目光留住。
 *   gazeRange     身高 × 2 + 3 格，夹 4..9；身量越高，视线拉得越远。
 *   ringRadius    宽度 × 1.6 + 1.2 格，夹 1.5..3.5；体型越宽，献舞时覆盖越大。
 *   maxOnlookers  2 + (等级 − 30) ÷ 20，夹 2..4 人；经验越足越能同时迷住更多人。
 *   tempo         速度 ÷ 8 + 4 刻，夹 6..14；速度越快越早抬眸。
 *   recharge      180 + (等级 − 30) × 1.5 刻，夹 160..260；等级越高越熟练，冷却略短。
 */
namespace PokemonSkills {
    export const captivateId = "captivate";
    export const captivateEffect = "world_combat:captivate_gaze";
    export const captivateScene = "world_combat:move_captivate";
    export const captivateSpot = "world_combat:status/captivated";

    actionParameters.define(captivateId, {
        drop: formula(F.when(F.stat("specialAttack").gte(110), F.const(3), F.const(2)), "特攻下降", {
            unit: " 级",
            description: "被迷住者损失的特攻等级；施法者特攻达到 110 时从 2 级升到 3 级。"
        }),
        duration: seconds(F.base(160, "基础").plus(F.individual("friendship").times(1.2).as("亲密度")).clamp(160, 380),
            "失神时长", "迷醉持续多久；施法者越亲近，越能把对方的目光留住。"),
        gazeRange: formula(F.body("height").times(2).plus(3).clamp(4, 9), "凝视距离", {
            unit: " 格",
            description: "目光能拉住对手的距离；施法者身形越高，看得越远。"
        }),
        ringRadius: formula(F.body("width").times(1.6).plus(1.2).clamp(1.5, 3.5), "旋舞半径", {
            unit: " 格",
            description: "献舞时所有看得见这份舞姿的非友方都落在这个半径内；体型越宽覆盖越大。"
        }),
        maxOnlookers: formula(F.base(2).plus(F.level().minus(30).max(0).div(20)).clamp(2, 4).round(0), "旋舞人数", {
            unit: " 人",
            description: "献舞时最多同时迷住几人；等级越高涵盖越多。"
        }),
        tempo: seconds(F.stat("speed").div(8).plus(4).clamp(6, 14), "起手",
            "摆好姿态需要多久；速度越快，越早抬眸。"),
        recharge: seconds(F.base(180).plus(F.level().minus(30).max(0).times(1.5)).clamp(160, 260), "冷却",
            "两次诱惑之间的等待；等级越高越熟练。")
    });
    describe(captivateId, [
        { key: "description.0", values: ["drop", "duration"] },
        { key: "description.1", values: ["gazeRange", "ringRadius", "maxOnlookers", "range"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
