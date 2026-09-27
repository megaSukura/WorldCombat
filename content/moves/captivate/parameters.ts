/**
 * 诱惑 / Captivate 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 allAdjacentFoes／boosts={spa:-2}／onTryImmunity 异性。
 * 世界化：一次抬眸锁住**一个看得见的对手**，把目光当作钩子。被真正看住的目标特攻下降，但这份下降只在
 *   注视维持期间存在：一条由动作与视线共同维持的窗口，断线、换招、被打断或被驱散都会立刻收回。
 *   原版生物、其他模组生物与玩家没有性别概念，直接生效；宝可梦之间的异性只作为风味，不再硬性拦截。
 *   这招不抓、不拉、不定身、不造成伤害，也从不把敌意强加给目标。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop        默认 2 级；`专注注视` 档改 3 级，降得更深，但要付出更长的起手与冷却。
 *   hold        窗口时长 100 + 亲密度 × 0.5 刻，夹 70..160；越亲近越能把这道目光多留住一会儿。
 *   gazeRange   身高 × 2 + 3 格，夹 4..9；身量越高，能在越远处开始注视。
 *   tempo       速度 ÷ 8 + 4 刻，夹 6..14；速度越快越早抬眸；专注注视多 5 刻。
 *   recharge    180 + (等级 − 30) × 1.5 刻，夹 160..260；等级越高越熟练；专注注视 ×1.3。
 */
namespace PokemonSkills {
    export const captivateId = "captivate";
    export const captivateEffect = "world_combat:captivate_gaze";
    export const captivateScene = "world_combat:move_captivate";
    export const captivateSpot = "world_combat:status/captivated";
    /** 本招本源的窗口来源；重施时用它刷新而不是叠加另一份。 */
    export const captivateContribution = "world_combat:move/captivate";
    /** 随动作存亡的注视锁：载体、窗口与持续表现都挂在它上面。 */
    export const captivateLock = "world_combat:captivate_lock";

    actionParameters.define(captivateId, {
        drop: formula(
            F.when(F.pref("focus", text("worldcombat.skill.captivate.preference.focus")), F.const(3), F.const(2))
                .clamp(2, 3),
            "特攻下降", {
                unit: " 级",
                description: "注视期间被看住者损失的特攻等级；专注注视从 2 级升到 3 级，代价是更长的起手与冷却。"
            }),
        hold: seconds(
            F.base(100).plus(F.individual("friendship").times(0.5)).clamp(70, 160).round(0),
            "注视时长", "目光最多维持多久；施法者越亲近，越能把这道视线留住，断线即提前收回。"),
        gazeRange: formula(F.body("height").times(2).plus(3).clamp(4, 9), "凝视距离", {
            unit: " 格",
            description: "能从多远开始注视；施法者身形越高，看得越远。目标跑出这个距离就断线。"
        }),
        tempo: seconds(F.stat("speed").div(8).plus(4).clamp(6, 14), "起手",
            "把目光聚起来需要多久；速度越快，越早抬眸。专注注视再多 5 刻。"),
        recharge: seconds(F.base(180).plus(F.level().minus(30).max(0).times(1.5)).clamp(160, 260), "冷却",
            "两次注视之间的等待；等级越高越熟练。专注注视的冷却为普通的 1.3 倍。")
    });
    describe(captivateId, [
        { key: "description.0", values: ["drop", "hold"] },
        { key: "description.1", values: ["gazeRange"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
