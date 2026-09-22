/** Default native companion controls, composed through the same open menu protocol as custom content. */
namespace NativeCompanionMenus {
    function text(key:string,...args:any[]):any{return {key:"worldcombat.ui."+key,args};}
    export function install(id: string, menus: CompanionMenus.Registry<NativeRepertoire.MenuContext>, skills: {
        [id: string]: NativeRepertoire.Skill;
    }): void {
        menus.provide(id + "/companionship", function (context) {
            var recalled = String(context.pokemon.activeState()) !== "sent-out" ? text("menu.recalled") : "";
            return { items: [
                    { id: "company", label: text("menu.company"), detail: text("menu.company_hint"), order: 10 },
                    { id: "company/follow", parent: "company", label: text("menu.follow"), detail: text("menu.follow_hint"), command: "follow", target: "none", disabled: recalled },
                    { id: "company/hold", parent: "company", label: text("menu.hold"), detail: text("menu.hold_hint"), command: "hold", target: "none", disabled: recalled },
                    { id: "company/autonomous", parent: "company", label: text("menu.autonomous"), detail: text("menu.autonomous_hint"), command: "autonomous", target: "none", disabled: recalled },
                    { id: "company/stay", parent: "company", label: text("menu.stay"), detail: text("menu.stay_hint"), command: "stay", target: "point", disabled: recalled },
                    { id: "cooperate", label: text("menu.cooperate"), detail: text("menu.cooperate_hint"), order: 20 },
                    { id: "cooperate/protect", parent: "cooperate", label: text("menu.protect"), detail: text("menu.protect_hint"), command: "protect", target: "entity", disabled: recalled },
                    { id: "cooperate/owner", parent: "cooperate", label: text("menu.owner"), detail: text("menu.owner_hint"), command: "protect", target: "owner", disabled: recalled },
                    { id: "cooperate/focus", parent: "cooperate", label: text("menu.focus"), detail: text("menu.focus_hint"), command: "focus", target: "entity", disabled: recalled },
                    { id: "moves", label: text("menu.moves"), detail: text("menu.moves_hint"), order: 30 },
                    { id: "attributes", label: {key:"worldcombat.attributes.title"}, detail: {key:"worldcombat.attributes.open_hint"}, command: "attributes", order: 80 },
                    { id: "preferences", label: text("preferences"), detail: text("menu.preferences_hint"), command: "preferences", order: 90 }
                ] };
        });
        menus.provide(id + "/loadout", function (context) {
            var nodes: CompanionMenus.Item[] = [];
            context.skills.forEach(function (skill) {
                var parent = "moves/" + skill.id, disabled = (skill.unavailableReason ? {key:"worldcombat.reason."+String(skill.unavailableReason).replace(/^worldcombat\.reason\./, "")} : "") || (skill.pp <= 0 ? text("menu.no_pp") : "");
                if (String(context.pokemon.activeState()) !== "sent-out")
                    disabled = text("menu.recalled");
                nodes.push({ id: parent, parent: "moves", label: skill.nameKey?{key:skill.nameKey}:skill.name, detail: skill.brief || "" });
                function cast(id: string, label: any, target: string, detail: any): void {
                    nodes.push({ id: parent + "/" + id, parent: parent, label: label, detail: detail, slot: skill.slot, move: skill.id,
                        command: "cast", target: target, disabled: disabled });
                }
                if (skill.kind === "self")
                    cast("self", text("menu.self"), "self", skill.brief || "");
                else if (skill.kind === "friend") {
                    cast("self", text("menu.self_friend"), "self", text("menu.self_hint",skill.nameKey?{key:skill.nameKey}:skill.name));
                    cast("owner", text("menu.player"), "owner", text("menu.player_hint",skill.nameKey?{key:skill.nameKey}:skill.name));
                    cast("target", text("menu.target"), "entity", text("menu.target_hint",skill.nameKey?{key:skill.nameKey}:skill.name));
                }
                else
                    cast("aim", skill.kind === "point" || skill.kind === "motion" ? text("menu.point") : text("menu.entity"), skill.kind === "enemy" ? "entity" : "aim", skill.brief || "");
                nodes.push({ id: parent + "/preferences", parent: parent, label: text("menu.move_preferences"), detail: text("menu.move_preferences_hint",skill.nameKey?{key:skill.nameKey}:skill.name), command: "preferences", move: skill.id });
            });
            return { items: nodes };
        });
        menus.provide(id + "/skills", function (context) {
            var output: CompanionMenus.Contribution = { items: [], remove: [] };
            context.skills.forEach(function (detail) {
                var definition = skills[detail.id], change = definition && definition.menu ? definition.menu(context, detail.slot) : null;
                if (change) {
                    output.items = output.items!.concat(change.items || []);
                    output.remove = output.remove!.concat(change.remove || []);
                }
            });
            return output;
        });
    }
}
