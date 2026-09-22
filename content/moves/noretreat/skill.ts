/**
 * 背水一战 / noretreat —— 执行组织。
 *
 * 核心念头：**一声怒吼顶起全身五道力，同时把脚钉进地里——退无可退。**
 *   它是本族唯一自己给自己上锁的一招：代价明明白白，这段时间里你挪不动半步，只能站定打。
 *   放它的时机是「我还站得住、且已经贴上了必须解决的目标」；低血时把自己钉在别人刀下并不划算。
 *
 * 三幕：
 *   聚（windup，提交前）：术者沉腰、脚下卷起一圈土纹（只观察与预告，可被打断不花代价）。
 *   立（commit）：五项各 +1 走 NativeEffects.boost（不忽略特性），给自己挂共享身份 `world_combat:status/noretreat`
 *      与 `world_combat:status/trapped` 的真实 MobEffect，移动归零；随后的持久标记 `world_combat:noretreat_stand`
 *      维持脚下的阵环，时长走完或术者倒下才拔脚。
 *   拔（release）：阵环散去、MobEffect 被精确移除，术者恢复自由。
 *
 * 与同族分开：扎根拿移动换续血、黑色目光靠凝视维持；背水一战拿移动换一次全项强化，锁更短、油门更猛。
 *
 * 配置 `rush`（疾战）由 resolve 改时序，由公式改时长／冷却：只顶三项、站得更短，但冷却更短。
 */
namespace PokemonSkills {
    const noRetreatReferenceRing = 1.6;

    function noRetreatStandData(json: string): string {
        const value = JSON.parse(json);
        ["standTicks", "boosts", "surge", "ring", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid no-retreat state");
        });
        return JSON.stringify(value);
    }

    function noRetreatVisual(world: CombatWorld, self: CombatActor, data: any, ticks: number): void {
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.keep(world, "noretreat:stand:" + String(self.ref()), noRetreatScene, 1, body.position(),
            { moment: "stand", target: String(self.ref()), boosts: data.boosts, surge: data.surge,
                ring: data.ring, scale: data.scale, intensity: data.intensity }, ticks);
    }

    WorldCombat.effect(noRetreatStand, 1, 600, "actor", noRetreatStandData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(noRetreatStand, "start", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        noRetreatVisual(world, self, JSON.parse(effect.state()), 24);
        effect.schedule("watch", "watch", 20, "{}");
    });
    WorldCombat.effectHandler(noRetreatStand, "watch", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        noRetreatVisual(world, self, JSON.parse(effect.state()), 24);
        effect.schedule("watch", "watch", 20, "{}");
    });
    WorldCombat.effectHandler(noRetreatStand, "end", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(self)) {
            const mark = MobEffects.read(world, self, noRetreatEffect);
            if (mark !== null) world.removeMobEffect(self, noRetreatEffect, mark.key());
            const body = world.observe(self);
            if (body !== null) {
                WorldFeedback.emit(world, noRetreatScene, 1, body.position(),
                    { moment: "release", target: String(self.ref()), ring: data.ring, scale: data.scale }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), noRetreatReleaseText, [], 22);
            }
        }
    });

    // 阵环被清掉（牛奶／/effect clear）时收回标记，避免留下没有结算的立誓。
    WorldCombat.on("world_combat:move_noretreat/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== noRetreatEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, noRetreatStand);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    // 立誓期间术者自己动不了：导航速度归零（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_noretreat/root", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), noRetreatEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        id: noRetreatId,
        name: "背水一战",
        description: "一声怒吼顶起全身的力，同时把脚钉进地里：攻击、防御、特攻、特防、速度各 +1，但这段时间里无法移动。已经立过誓时不能再立；低血时把自己钉在别人刀下并不划算。",
        uses: ["在开打前把全身顶满，逼对手在你的阵里正面接战", "被追上时用一次全项强化换最后一段输出", "配合队友的控制，把强化窗口放在对方走不掉的时候"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 160,
        style: "stand",
        stationary: true,
        defaults: { rush: false, ai: { maxChase: 12 } },
        fields: [
            field(pathOf("rush"), "疾战", "boolean", { help: "开启（疾战）：只顶起攻击、特攻、速度三项，立誓时长减半、冷却 ×0.75——出手快、脱身快，但放弃双防。关闭（背水）：五项全 +1，站得更久、冷却更长——全面强化，但把自己钉得更久。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[noRetreatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(noRetreatId, "tempo", context)),
                recover: Math.round(p(noRetreatId, "aftercast", context)),
                cooldown: Math.round(p(noRetreatId, "recharge", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            if (CombatStatus.has(world, self, "noretreat")) return "already-noretreat";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_noretreat:gather", noRetreatScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", rush: config && config.rush === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(noRetreatId, "ring"), geometry: "circle", style: "stand", color: 0xE0B040,
                label: config && config.rush === true ? "背水一战 · 疾战" : "背水一战" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            if (CombatStatus.has(world, self, "noretreat")) { done(action); return; }
            const rush = !!(config && config.rush);
            const standTicks = Math.max(80, Math.round(p(noRetreatId, "standTicks", action)));
            const surge = Math.max(8, Math.round(p(noRetreatId, "surge", action)));
            const ring = Math.max(0.8, p(noRetreatId, "ring", action));
            const scale = Math.max(0.5, Math.min(2.2, ring / noRetreatReferenceRing));
            const intensity = Math.max(0.7, Math.min(2.2, surge / 20));
            const stats = rush ? ["atk", "spa", "spe"] : ["atk", "def", "spa", "spd", "spe"];
            for (let index = 0; index < stats.length; index++) NativeEffects.boost(world, self, stats[index], 1);
            if (!CombatStatus.has(world, self, "trapped"))
                CombatStatus.apply(world, self, "noretreat", noRetreatEffect, standTicks, 0, { unique: true });
            world.stopMovement(self);
            const marks = world.effects(self, noRetreatStand);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(noRetreatStand, self, JSON.stringify({ standTicks: standTicks, boosts: stats.length,
                surge: surge, ring: ring, scale: scale, intensity: intensity }), standTicks);
            WorldFeedback.emit(world, noRetreatScene, 1, body.position(),
                { moment: "burst", target: String(self.ref()), boosts: stats.length, surge: surge, ring: ring,
                    scale: scale }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), noRetreatRootText,
                [stats.length, Math.round(standTicks / 20 * 10) / 10], 28);
            sound(action, "minecraft:entity.ravager.roar");
            done(action);
        }
    });
}
