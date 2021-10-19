import sys

tag=sys.argv[1]
type=sys.argv[2]

splitted_tag=tag.split('-')

if type == "version":
  print(splitted_tag[0])
  sys.exit(0)

if type == "app":
  app_string=""
  for i in range(1, len(splitted_tag) - 1):
    app_string = app_string + "-" + splitted_tag[i]
  print(app_string[1:])
  sys.exit(0)

if type == "network":
  print(splitted_tag[-1])