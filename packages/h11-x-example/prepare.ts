await makeSsg({
  routes: [{ type: 'ssg', dir: './src/routes/about', name: 'about.ssg' }],
  prod: true,
});
