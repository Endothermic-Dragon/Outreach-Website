package.json specifies browser support
Setting quick_compile to true skips installing python and node modules

Choose a good font:
- Noto Sans
- Segoe UI
- Roboto
- Helvetica Neue


Data format (rough draft):

user-map:
{
    "google_user_id": {
        "name": "Baguette",
        "profile_picture": google-picture | uploaded, (see https://stackoverflow.com/questions/5613898)
        "tags": [from access-levels],
        "subteam": subteam-id
    }
}

access-levels:
{
    "level-id-1" : "student",
    "level-id-2" : "mentor",
    "level-id-3" : "admin",
    "level-id-4" : "superadmin"
}

