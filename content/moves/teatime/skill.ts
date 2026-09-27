/** 茶会：范围内敌友各自吃掉携带的树果；结算用可辨树果向各持有者收合并 sip，随后只留短余韵。 */
namespace PokemonSkills {
    const teatimeScene = "world_combat:move_teatime";
    const teatimeSipScene = "world_combat:move_teatime_sip";
    const teatimeServedText = "world_combat.move.teatime.text.served";
    const teatimeSipText = "world_combat.move.teatime.text.sip";
    const teatimeEmptyText = "world_combat.move.teatime.text.empty";
    /** 表现里的参考半径：`data.scale = 实际茶席半径 / 这个数`。 */
    export const teatimeReferenceRadius = 4.0;

    /** 该树果可复用的真实图集贴图；只对自带 berries 图集的 cobblemon 树果给出，不猜别的命名空间。 */
    export function teatimeBerrySprite(berry: NativeItems.Berry): string {
        return berry.id.indexOf("cobblemon:") === 0 ? "cobblemon:item/berries/" + berry.path : "";
    }

    /** 某个战斗者手里是否带着树果（统一装备读取：宝可梦携带物 / 原版生物与玩家的手）。 */
    export function teatimeHoldsBerry(world: CombatWorld, actor: CombatActor): boolean {
        return NativeItems.berryFrom(NativeItems.heldOf(world, actor)) !== null;
    }
    /** 某个战斗者手里的树果；不是树果时返回 null。 */
    export function teatimeBerryOf(world: CombatWorld, actor: CombatActor): NativeItems.Berry | null {
        return NativeItems.berryFrom(NativeItems.heldOf(world, actor));
    }
    /** 把吃下的树果效果落到吃的人身上；回复量按茶汤浓度缩放。走共享树果注册库，本招不取尖刺反噬。 */
    export function teatimeAbsorb(world: CombatWorld, actor: CombatActor, berry: NativeItems.Berry, brew: number): NativeItems.EatResult {
        return NativeItems.eat(world, actor, berry, brew, 0, "teatime_berry");
    }

    /** 伙伴 AI 读取本招的实际茶席半径（含该个体的配置），用于判断圈里是否有人值得招呼。 */
    export function teatimeRadius(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return teatimeReferenceRadius;
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills[teatimeId],
            detail: { values: config(world, actor, teatimeId) }, world: world, actor: actor };
        return p(teatimeId, "radius", context);
    }

    define({
        id: teatimeId,
        cooldownParameter: "wait", name: "茶会",
        description: "在选定的地方铺开一席茶；茶香范围内每个带着树果的战斗者（不分敌我）都会吃掉自己那颗，果子效果落到本人身上。它能给队友的果子立刻生效，也能逼对手把保命或反击的果子提前吃掉。盛宴让茶席更广、沏得更浓，代价是起手与冷却更长。",
        uses: ["在对手扎堆处摆茶，一次掀掉一圈人手里的树果", "让队友手里的回复／能力树果立刻生效", "把对手的反击树果提前逼出来"],
        kind: "point", range: 5, maxRange: 9, prepare: 10, active: 1, recover: 6, cooldown: 150, style: "tea",
        maximumTicks: 260,
        defaults: { grand: false, ai: { minHolders: 1, maxChase: 12, stripFoes: true } },
        fields: [flag("grand", "盛宴")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[teatimeId], detail: { values: config } };
            return { radius: p(teatimeId, "radius", context), geometry: "area", style: "tea", color: 0xC98A4B,
                label: config && config.grand === true ? "茶会 · 盛宴" : "茶会" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[teatimeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(teatimeId, "tempo", context))),
                recover: Math.max(3, Math.round(p(teatimeId, "aftercast", context))),
                cooldown: Math.round(p(teatimeId, "wait", context)),
                active: 1,
                range: p(teatimeId, "reach", context)
            };
        },
        /** 茶席范围内至少有一个圈内、可被茶香直达的带树果者（含自己站进圈内），这一席才摆得有意义。 */
        ready: function (action) {
            const world = action.sense(), centre = action.targetPosition();
            const radius = Math.max(2, p(teatimeId, "radius", action));
            const selfBody = world.observe(action.actor());
            if (selfBody !== null && selfBody.position().minus(centre).length() <= radius
                && world.clear(centre, selfBody.position()) && teatimeHoldsBerry(world, action.actor())) return "";
            const actors = world.query(centre, radius, false);
            for (let i = 0; i < actors.length; i++) {
                const body = world.observe(actors[i]);
                if (body === null || body.position().minus(centre).length() > radius) continue;
                if (!world.clear(centre, body.position())) continue;
                if (teatimeHoldsBerry(world, actors[i])) return "";
            }
            return "no-berry";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_teatime:pour", teatimeScene, 1, action.origin(),
                JSON.stringify({ moment: "pour", motes: Math.round(p(teatimeId, "motes", action)),
                    grand: config && config.grand === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = action.targetPosition();
            const radius = Math.max(2, p(teatimeId, "radius", action));
            const afterglow = Math.max(20, Math.round(p(teatimeId, "teaTicks", action)));
            const motes = Math.max(14, Math.round(p(teatimeId, "motes", action)));
            const cups = Math.max(3, Math.round(p(teatimeId, "cups", action)));
            const brew = Math.max(0.4, p(teatimeId, "brew", action));
            const scale = radius / teatimeReferenceRadius;

            WorldFeedback.emit(world, teatimeScene, 1, action.origin(),
                { moment: "pour", motes: motes, scale: scale }, 22);
            world.sound("minecraft:block.brewing_stand.brew", centre, 14, "{}");
            WorldFeedback.emit(world, teatimeScene, 1, centre,
                { moment: "serve", radius: radius, motes: motes, cups: cups, scale: scale }, 30);
            // 结算只在此刻一次；之后只留短促余韵，不用长蒸汽暗示还能续杯入席。
            WorldFeedback.emit(world, teatimeScene, 1, centre,
                { moment: "steep", radius: radius, motes: Math.max(12, Math.round(motes * 0.6)), scale: scale }, afterglow);

            let eaters = 0;
            const holders: any[] = [];
            const actors = world.query(centre, radius, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i], ref = String(other.ref());
                if (!world.valid(other)) continue;
                const before = world.observe(other);
                if (before === null || before.position().minus(centre).length() > radius) continue;
                // 隔墙不吃：逐人检查茶席中心到本人的真实遮挡。
                if (!world.clear(centre, before.position())) continue;
                const heldBerry = NativeItems.heldBerry(world, other);
                if (heldBerry === null) continue;
                if (!NativeItems.takeHeld(world, other, heldBerry.held).ok) continue;
                eaters++;
                // 记录真正落地的能力提升，而不是申请值（eat 内部会被上限/取消截断）。
                const beforeStages = NativeEffects.effectiveStages(world, other);
                const result = teatimeAbsorb(world, other, heldBerry.berry, brew);
                const after = world.observe(other);
                const gainedStages = result.stat ? NativeEffects.effectiveStage(world, other, result.stat) - (beforeStages[result.stat] || 0) : 0;
                const point = after === null ? before.position() : after.position();
                if (result.healed > 0) feedback(world, other, point, "heal", { amount: result.healed });
                world.sound("cobblemon:item.berry.eat.full", point, 10, "{}");
                WorldFeedback.emit(world, teatimeScene, 1, point,
                    { moment: "sip", target: ref, berry: 1, gained: result.healed, stages: gainedStages, cured: result.cured.length,
                        stat: result.stat || "", motes: Math.max(8, Math.round(motes * 0.5)), scale: scale }, 22);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), teatimeSipText,
                    [{ key: heldBerry.berry.name, fallback: "berry" }], 26);
                holders.push({ ref: ref, at: [point.x(), point.y(), point.z()], sprite: teatimeBerrySprite(heldBerry.berry),
                    name: heldBerry.berry.name, stages: gainedStages });
            }
            // 可辨树果：按每人真实吃下的树果贴图向本人收合，和各自的 sip 同拍。
            if (holders.length) WorldFeedback.emit(world, teatimeSipScene, 1, centre,
                { holders: holders, start: world.tick(), duration: 22, scale: scale }, 26);

            if (eaters > 0) {
                world.sound("minecraft:block.note_block.bell", centre, 12, "{}");
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)), teatimeServedText, [eaters], 30);
            } else {
                WorldFeedback.emit(world, teatimeScene, 1, centre, { moment: "empty", scale: scale }, 20);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)), teatimeEmptyText, [], 24);
            }
            done(action);
        }
    });
}
